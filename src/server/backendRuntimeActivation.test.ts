import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { analyticsIngestionWarehouseRequiredConfigKeys } from "../domain/analyticsIngestionRuntime";
import {
  createBackendRuntimeActivationContract,
  productionRuntimeDependencyBlockerIds,
  runtimeActivationEnvironmentKeys,
  runtimeActivationConfigKeys,
} from "./backendRuntimeActivation";
import { objectStorageExportRequiredConfigKeys } from "./objectStorageExportRuntime";
import { bullmqConstructionProductionPreconditions } from "./bullmqConstructionReadiness";
import { liveQueueConsumeProductionPreconditions } from "./liveQueueConsumeLoop";
import { liveQueuePublishingProductionPreconditions } from "./liveQueuePublishingReadiness";
import { queueProviderAdapterProductionPreconditions } from "./queueProviderAdapter";
import { queueProviderDriverProductionPreconditions } from "./queueProviderDriver";
import { queueProviderSdkBindingProductionPreconditions } from "./queueProviderSdkBinding";
import { queueProviderPackageProductionPreconditions } from "./queueProviderPackageBinding";
import { redisBrokerConnectionProductionPreconditions } from "./redisBrokerConnectionReadiness";
import { schedulerRuntimeProductionPreconditions } from "./schedulerRuntime";
import { observabilityExporterProductionPreconditions } from "./observabilityExporter";
import { resolveApiServerRuntimeContract } from "./serverRuntime";
import { workerLeaseStoreProductionPreconditions } from "./workerLeaseStore";

const secretFragments = [
  "bearer sample-token",
  "https://scheduler.invalid/scheduler-pass",
  "https://lease.invalid/lease-secret",
  "metadata-provider-secret",
  "operator-policy-secret",
  "bullmq-redis-binding-secret",
  "redis.invalid",
  "redis-password",
  "https://queue.invalid/queue-secret",
  "https://queue.invalid/dead-letter?token=queue-secret",
  "@provider/queue-sdk",
  "https://store.invalid/token=idempotency-secret",
  "https://observability.invalid/token=observability-secret",
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

const providerClientConfigKeys = [
  "CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT",
  "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
  "CAMPAIGN_OS_PROVIDER_ENDPOINT_REF",
  "CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF",
  "CAMPAIGN_OS_PROVIDER_CLIENT_SEAM",
  "CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY",
  "CAMPAIGN_OS_PROVIDER_RETRY_POLICY",
  "CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_POLICY",
  "CAMPAIGN_OS_PROVIDER_DEGRADATION_POLICY",
  "CAMPAIGN_OS_PROVIDER_WORKER_QUEUE_HANDOFF",
  "CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF",
  "CAMPAIGN_OS_PROVIDER_RUNBOOK_URL",
  "CAMPAIGN_OS_PROVIDER_REDACTION_POLICY",
];

const providerHttpRuntimeConfigKeys = [
  "CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT",
  "CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REGISTRY_REF",
  "CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REF",
  "CAMPAIGN_OS_PROVIDER_HTTP_CREDENTIAL_REF",
  "CAMPAIGN_OS_PROVIDER_HTTP_HEADER_REF",
  "CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM",
  "CAMPAIGN_OS_PROVIDER_HTTP_TIMEOUT_POLICY",
  "CAMPAIGN_OS_PROVIDER_HTTP_RESPONSE_MAPPING_POLICY",
  "CAMPAIGN_OS_PROVIDER_HTTP_REDACTION_POLICY",
  "CAMPAIGN_OS_PROVIDER_HTTP_QUEUE_WORKER_HANDOFF",
  "CAMPAIGN_OS_PROVIDER_HTTP_IDEMPOTENCY_REF",
  "CAMPAIGN_OS_PROVIDER_HTTP_LEASE_REF",
  "CAMPAIGN_OS_PROVIDER_HTTP_RUNBOOK_REF",
];

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
        CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-binding-secret",
        CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT: "redis-health-check-secret",
        CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "redis-circuit-secret",
        CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "redis-timeout-secret",
        CAMPAIGN_OS_REDIS_CREDENTIALS: "redis-credentials-secret",
        CAMPAIGN_OS_REDIS_DATABASE: "redis-database-secret",
        CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "redis-retry-secret",
        CAMPAIGN_OS_REDIS_TLS_POLICY: "redis-tls-secret",
        CAMPAIGN_OS_REDIS_URL: "redis://redis-user:redis-password@redis.invalid:6379/0",
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
    const queueProviderDriverConfigKeys = [
      ...new Set(queueProviderDriverProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const queueProviderSdkBindingConfigKeys = [
      ...new Set(
        queueProviderSdkBindingProductionPreconditions
          .flatMap((precondition) => precondition.requiredConfigKeys)
          .map((key) =>
            key === "CAMPAIGN_OS_QUEUE_PROVIDER_BINDING" ? "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING" : key
          ),
      ),
    ];
    const queueProviderPackageConfigKeys = [
      ...new Set(queueProviderPackageProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const bullmqConstructionConfigKeys = [
      ...new Set(bullmqConstructionProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const redisBrokerConnectionConfigKeys = [
      ...new Set(redisBrokerConnectionProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const observabilityExporterConfigKeys = [
      ...new Set(observabilityExporterProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const liveQueuePublishingConfigKeys = [
      ...new Set(liveQueuePublishingProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];
    const liveQueueConsumeConfigKeys = [
      ...new Set(liveQueueConsumeProductionPreconditions.flatMap((precondition) => precondition.requiredConfigKeys)),
    ];

    expect(runtimeActivationConfigKeys.map((item) => item.key)).toEqual(
      expect.arrayContaining(providerClientConfigKeys),
    );
    expect(runtimeActivationConfigKeys.map((item) => item.key)).toEqual(
      expect.arrayContaining(providerHttpRuntimeConfigKeys),
    );
    expect(runtimeActivationConfigKeys.map((item) => item.key)).toEqual(
      expect.arrayContaining([...objectStorageExportRequiredConfigKeys]),
    );
    expect(runtimeActivationConfigKeys.map((item) => item.key)).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_API_HOST",
        "CAMPAIGN_OS_API_PORT",
        "CAMPAIGN_OS_API_CORS_ORIGINS",
        "CAMPAIGN_OS_BACKEND_PROFILE",
        "CAMPAIGN_OS_DATABASE_URL",
        "CAMPAIGN_OS_AUTH_SECRET",
        "CAMPAIGN_OS_QUEUE_PROVIDER",
        "CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER",
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_QUEUE_PROVIDER_KIND",
        "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE",
        "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING",
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING",
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
        "CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT",
        "CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY",
        "CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT",
        "CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY",
        "CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS",
        "CAMPAIGN_OS_REDIS_CREDENTIALS",
        "CAMPAIGN_OS_REDIS_DATABASE",
        "CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY",
        "CAMPAIGN_OS_REDIS_TLS_POLICY",
        "CAMPAIGN_OS_REDIS_URL",
        "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT",
        "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER",
        "CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT",
        "CAMPAIGN_OS_LIVE_QUEUE_CONSUMER",
        "CAMPAIGN_OS_CONSUME_HANDLER_REGISTRY",
        "CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY",
        "CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY",
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
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS",
        "CAMPAIGN_OS_OBSERVABILITY_SINK",
        "CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE",
        "CAMPAIGN_OS_OBSERVABILITY_RETENTION_DAYS",
        "CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL",
        "CAMPAIGN_OS_OBSERVABILITY_LOG_SINK_URL",
        "CAMPAIGN_OS_OBSERVABILITY_ALERT_ROUTING",
        "CAMPAIGN_OS_OBSERVABILITY_RETRY_DEAD_LETTER_POLICY",
        "CAMPAIGN_OS_OBSERVABILITY_REDACTION_POLICY",
        "CAMPAIGN_OS_OBSERVABILITY_RUNBOOK_URL",
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
        "CAMPAIGN_OS_QUEUE_PROVIDER_KIND",
        "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE",
        "CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING",
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING",
        "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
        "CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT",
        "CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY",
        "CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT",
        "CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY",
        "CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS",
        "CAMPAIGN_OS_REDIS_CREDENTIALS",
        "CAMPAIGN_OS_REDIS_DATABASE",
        "CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY",
        "CAMPAIGN_OS_REDIS_TLS_POLICY",
        "CAMPAIGN_OS_REDIS_URL",
        "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT",
        "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER",
        "CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY",
        "CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY",
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
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS",
        "CAMPAIGN_OS_OBSERVABILITY_SINK",
        "CAMPAIGN_OS_OBSERVABILITY_METRIC_NAMESPACE",
        "CAMPAIGN_OS_OBSERVABILITY_RETENTION_DAYS",
        "CAMPAIGN_OS_OBSERVABILITY_TRACE_COLLECTOR_URL",
        "CAMPAIGN_OS_OBSERVABILITY_LOG_SINK_URL",
        "CAMPAIGN_OS_OBSERVABILITY_ALERT_ROUTING",
        "CAMPAIGN_OS_OBSERVABILITY_RETRY_DEAD_LETTER_POLICY",
        "CAMPAIGN_OS_OBSERVABILITY_REDACTION_POLICY",
        "CAMPAIGN_OS_OBSERVABILITY_RUNBOOK_URL",
        "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
        "CAMPAIGN_OS_DEGRADATION_POLICY",
        "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
      ]),
    );
    for (const providerClientConfigKey of providerClientConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: providerClientConfigKey === "CAMPAIGN_OS_PROVIDER_WORKER_QUEUE_HANDOFF"
              ? "queue"
              : providerClientConfigKey === "CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF"
                ? "worker"
                : "provider",
            key: providerClientConfigKey,
            redacted: true,
            required: true,
            requiredFor: "production-required",
            status: "blocked",
          }),
        ]),
      );
    }
    for (const providerHttpRuntimeConfigKey of providerHttpRuntimeConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: providerHttpRuntimeConfigKey,
            redacted: true,
            required: true,
            requiredFor: "production-required",
          }),
        ]),
      );
    }
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
    for (const queueProviderDriverConfigKey of queueProviderDriverConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: queueProviderDriverConfigKey,
            redacted: true,
            required: true,
            requiredFor: "production-required",
          }),
        ]),
      );
    }
    for (const queueProviderSdkBindingConfigKey of queueProviderSdkBindingConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: queueProviderSdkBindingConfigKey,
            redacted: true,
            required: true,
            requiredFor: "production-required",
          }),
        ]),
      );
    }
    for (const queueProviderPackageConfigKey of queueProviderPackageConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: queueProviderPackageConfigKey,
            redacted: true,
          }),
        ]),
      );
    }
    for (const bullmqConstructionConfigKey of bullmqConstructionConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: bullmqConstructionConfigKey,
            redacted: true,
            required: true,
            requiredFor: "production-required",
          }),
        ]),
      );
    }
    for (const redisBrokerConnectionConfigKey of redisBrokerConnectionConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: redisBrokerConnectionConfigKey,
            redacted: true,
            required: true,
            requiredFor: "production-required",
          }),
        ]),
      );
    }
    for (const liveQueuePublishingConfigKey of liveQueuePublishingConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: liveQueuePublishingConfigKey,
            redacted: true,
            required: true,
            requiredFor: "production-required",
          }),
        ]),
      );
    }
    for (const liveQueueConsumeConfigKey of liveQueueConsumeConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: liveQueueConsumeConfigKey,
            redacted: true,
          }),
        ]),
      );
    }
    for (const observabilityExporterConfigKey of observabilityExporterConfigKeys) {
      expect(activation.deploymentHandoff.environmentKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: observabilityExporterConfigKey,
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
          key: "CAMPAIGN_OS_REDIS_CREDENTIALS",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "provider",
          key: "CAMPAIGN_OS_REDIS_TLS_POLICY",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "provider",
          key: "CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT",
          redacted: true,
          required: true,
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
          category: "provider",
          key: "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "provider",
          key: "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "provider",
          key: "CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "provider",
          key: "CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "provider",
          key: "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "provider",
          key: "CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "queue",
          key: "CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "queue",
          key: "CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY",
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
          key: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "observability",
          key: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "auth",
          key: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_CREDENTIALS",
          redacted: true,
          required: true,
          status: "blocked",
        }),
        expect.objectContaining({
          category: "observability",
          key: "CAMPAIGN_OS_OBSERVABILITY_RUNBOOK_URL",
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
        expect.objectContaining({
          area: "provider",
          blockedBy: ["CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT"],
          id: "provider-client-provider-client-activation",
          status: "blocked",
        }),
        expect.objectContaining({
          area: "queue",
          blockedBy: ["CAMPAIGN_OS_PROVIDER_WORKER_QUEUE_HANDOFF"],
          id: "provider-client-provider-client-worker-queue-handoff",
          status: "blocked",
        }),
        expect.objectContaining({
          area: "worker",
          blockedBy: ["CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF"],
          id: "provider-client-provider-client-consume-readiness-handoff",
          status: "blocked",
        }),
        expect.objectContaining({
          area: "provider",
          blockedBy: ["CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT"],
          id: "provider-http-runtime-provider-http-runtime-activation",
          status: "blocked",
        }),
        expect.objectContaining({
          area: "provider",
          blockedBy: ["CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM"],
          id: "provider-http-runtime-provider-http-transport-seam",
          status: "blocked",
        }),
        expect.objectContaining({
          area: "queue",
          blockedBy: ["CAMPAIGN_OS_PROVIDER_HTTP_QUEUE_WORKER_HANDOFF"],
          id: "provider-http-runtime-provider-http-queue-worker-handoff",
          status: "blocked",
        }),
        expect.objectContaining({
          area: "worker",
          blockedBy: ["CAMPAIGN_OS_PROVIDER_HTTP_IDEMPOTENCY_REF"],
          id: "provider-http-runtime-provider-http-idempotency-reference",
          status: "blocked",
        }),
        expect.objectContaining({
          area: "worker",
          blockedBy: ["CAMPAIGN_OS_PROVIDER_HTTP_LEASE_REF"],
          id: "provider-http-runtime-provider-http-lease-reference",
          status: "blocked",
        }),
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
        expect.objectContaining({ area: "observability", id: "observability-exporter-selection", status: "blocked" }),
        expect.objectContaining({ area: "observability", id: "observability-exporter-endpoint", status: "blocked" }),
        expect.objectContaining({ area: "observability", id: "observability-exporter-credentials", status: "blocked" }),
        expect.objectContaining({ area: "observability", id: "observability-sink-registration", status: "blocked" }),
        expect.objectContaining({ area: "observability", id: "observability-metric-namespace", status: "blocked" }),
        expect.objectContaining({ area: "observability", id: "observability-operator-runbook", status: "deferred" }),
        expect.objectContaining({ area: "provider", id: "provider-handoff", status: "deferred" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-handoff", status: "deferred" }),
        expect.objectContaining({ area: "queue", id: "queue-dead-letter", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-adapter-queue-provider-selection", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-adapter-queue-provider-endpoint", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-adapter-queue-provider-credentials", status: "blocked" }),
        expect.objectContaining({ area: "queue", id: "queue-provider-adapter-queue-provider-worker-queue-url", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-driver-queue-provider-driver-selection", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-driver-queue-provider-driver-endpoint", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-driver-queue-provider-driver-credentials", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-driver-queue-provider-driver-live-enable-gate", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-sdk-binding-queue-provider-sdk-package-reference", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-sdk-binding-queue-provider-sdk-binding-registration", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-sdk-binding-queue-provider-sdk-live-enable-gate", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-package-queue-provider-package-approved-dependency", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-package-queue-provider-package-binding-registration", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-package-queue-provider-package-redis-endpoint-reference", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "queue-provider-package-queue-provider-package-live-enable-gate", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "bullmq-construction-bullmq-construction-activation", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "bullmq-construction-bullmq-construction-factory", status: "blocked" }),
        expect.objectContaining({ area: "observability", id: "bullmq-construction-bullmq-construction-observability-handoff", status: "deferred" }),
        expect.objectContaining({ area: "provider", id: "bullmq-construction-bullmq-construction-runbook", status: "deferred" }),
        expect.objectContaining({ area: "provider", id: "redis-broker-redis-broker-credentials-reference", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "redis-broker-redis-broker-health-check-enable-gate", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "live-queue-publishing-live-queue-publishing-activation", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "live-queue-publishing-live-queue-publisher", status: "blocked" }),
        expect.objectContaining({ area: "queue", id: "live-queue-publishing-live-queue-payload-reference-policy", status: "blocked" }),
        expect.objectContaining({ area: "queue", id: "live-queue-publishing-live-queue-redaction-policy", status: "blocked" }),
        expect.objectContaining({ area: "provider", id: "live-queue-consume-live-queue-consume-activation", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "live-queue-consume-live-queue-consumer", status: "blocked" }),
        expect.objectContaining({ area: "worker", id: "live-queue-consume-live-queue-handler-registry", status: "blocked" }),
        expect.objectContaining({ area: "queue", id: "live-queue-consume-live-queue-consume-payload-reference-policy", status: "blocked" }),
        expect.objectContaining({ area: "queue", id: "live-queue-consume-live-queue-consume-redaction-policy", status: "blocked" }),
        expect.objectContaining({ area: "contract", id: "contract-writer", status: "blocked" }),
        expect.objectContaining({ area: "storage", id: "object-storage", status: "deferred" }),
        expect.objectContaining({
          area: "storage",
          attachPoint: "src/server/objectStorageExportRuntime.ts",
          blockedBy: expect.arrayContaining([...objectStorageExportRequiredConfigKeys]),
          id: "object-storage-export",
          status: "deferred",
        }),
        expect.objectContaining({ area: "observability", id: "observability-exporter", status: "deferred" }),
        expect.objectContaining({
          area: "analytics",
          attachPoint: "src/server/analyticsIngestionRuntime.ts",
          blockedBy: expect.arrayContaining([...analyticsIngestionWarehouseRequiredConfigKeys]),
          id: "analytics-ingestion",
          status: "deferred",
        }),
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
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        queueProviderDriverProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/queueProviderDriver.ts",
            id: `queue-provider-driver-${precondition.id}`,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        queueProviderSdkBindingProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/queueProviderSdkBinding.ts",
            id: `queue-provider-sdk-binding-${precondition.id}`,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        queueProviderPackageProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/queueProviderPackageBinding.ts",
            id: `queue-provider-package-${precondition.id}`,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        bullmqConstructionProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/bullmqConstructionReadiness.ts",
            id: `bullmq-construction-${precondition.id}`,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        redisBrokerConnectionProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/redisBrokerConnectionReadiness.ts",
            id: `redis-broker-${precondition.id}`,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        liveQueuePublishingProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/liveQueuePublishingReadiness.ts",
            id: `live-queue-publishing-${precondition.id}`,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        liveQueueConsumeProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/liveQueueConsumeLoop.ts",
            id: `live-queue-consume-${precondition.id}`,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expect(activation.productionDependencyBlockers).toEqual(
      expect.arrayContaining(
        observabilityExporterProductionPreconditions.map((precondition) =>
          expect.objectContaining({
            attachPoint: "src/server/observabilityExporter.ts",
            id: precondition.id,
            requiredBeforeProduction: true,
            status: precondition.status,
          }),
        ),
      ),
    );
    expectNoSecretLeak(activation);
  });
});
