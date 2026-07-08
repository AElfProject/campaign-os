import { describe, expect, it } from "vitest";
import {
  SUPPORTED_QUEUE_PROVIDER_PACKAGE_BINDING_PROFILES,
  createQueueProviderPackageBinding,
  getQueueProviderPackageBindingRegistration,
  queueProviderPackageNoLiveFlags,
  queueProviderPackageProductionPreconditions,
  redactQueueProviderPackageValue,
} from "./queueProviderPackageBinding";
import {
  redisBrokerConnectionProductionPreconditions,
  type RedisBrokerConnectionDiagnosticCode,
} from "./redisBrokerConnectionReadiness";
import type { BullmqConstructionFactory } from "./bullmqConstructionReadiness";

const productionReadyBrokerEnv = {
  CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "circuit-breaker:fail-closed",
  CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "2500",
  CAMPAIGN_OS_REDIS_CREDENTIALS: "credential-ref:redis-broker",
  CAMPAIGN_OS_REDIS_DATABASE: "database-ref:0",
  CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "retry-backoff:exponential",
  CAMPAIGN_OS_REDIS_TLS_POLICY: "tls-policy:required",
} satisfies Record<string, unknown>;

const redisBrokerMissingDiagnosticCodes: RedisBrokerConnectionDiagnosticCode[] = [
  "REDIS_BROKER_ENDPOINT_REFERENCE_MISSING",
  "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING",
  "REDIS_BROKER_TLS_POLICY_MISSING",
  "REDIS_BROKER_DATABASE_SELECTION_MISSING",
  "REDIS_BROKER_TIMEOUT_POLICY_MISSING",
  "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING",
  "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING",
  "REDIS_BROKER_OBSERVABILITY_HANDOFF_MISSING",
  "REDIS_BROKER_RUNBOOK_MISSING",
  "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING",
];

const productionReadyPackageEnv = {
  ...productionReadyBrokerEnv,
  CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:review",
  CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
  CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
  CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
  CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-provider-package-binding",
  CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-provider-package",
  CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
  CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
  CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:review",
  CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
  CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
} satisfies Record<string, unknown>;

const productionReadyConstructionEnv = {
  ...productionReadyPackageEnv,
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY: "factory-ref:bullmq-construction",
} satisfies Record<string, unknown>;

describe("queue provider package binding foundation", () => {
  it("declares the approved BullMQ Redis-compatible package metadata", () => {
    const foundation = createQueueProviderPackageBinding();
    const registration = getQueueProviderPackageBindingRegistration("bullmq-redis-package-binding-local");

    expect(foundation.id).toBe("campaign-os-queue-provider-package-binding-foundation");
    expect(SUPPORTED_QUEUE_PROVIDER_PACKAGE_BINDING_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
    expect(registration).toMatchObject({
      bindingId: "bullmq-redis-package-binding-local",
      brokerConnectionPosture: "not_configured",
      mode: "dry_run",
      status: "local_ready",
    });
    expect(foundation.definition).toMatchObject({
      browserBundleAllowed: false,
      family: "bullmq-redis-compatible",
      importPosture: "declared_dependency_metadata",
      packageName: "bullmq",
      packageRef: "npm:bullmq",
      providerKind: "redis-compatible",
      redisCompatible: true,
      serverOnly: true,
    });
  });

  it("keeps local review deterministic, valid, fast, server-only, and no-live", () => {
    const startedAt = performance.now();
    const foundation = createQueueProviderPackageBinding({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.bindingId).toBe("bullmq-redis-package-binding-local");
    expect(foundation.mode).toBe("dry_run");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.sdkClientConstructed).toBe(false);
    expect(foundation.liveBrokerConnectionAttempted).toBe(false);
    expect(foundation.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.liveWorkerExecutionEnabled).toBe(false);
    expect(foundation.noLiveFlags).toEqual(queueProviderPackageNoLiveFlags);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.bullmqConstruction).toMatchObject({
      activationStatus: "disabled",
      bullmqConstructionAttempted: false,
      bullmqConstructionFactoryInvoked: false,
      productionReady: false,
      queueClientConstructed: false,
      queueEventsConstructed: false,
      status: "local_ready",
      workerConstructed: false,
    });
    expect(foundation.healthCheck).toMatchObject({
      liveBrokerHealthCheckAttempted: false,
      packageImportAttempted: false,
      sdkClientConstructionAttempted: false,
      status: "local_ok",
    });
    expect(foundation.readiness).toMatchObject({
      browserBundleAllowed: false,
      liveBrokerConnectionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      packageName: "bullmq",
      packageRef: "npm:bullmq",
      productionReady: false,
      providerKind: "redis-compatible",
      bullmqConstructionAttempted: false,
      bullmqConstructionFactoryInvoked: false,
      bullmqConstructionProductionReady: false,
      bullmqConstructionStatus: "local_ready",
      sdkClientConstructed: false,
      valid: true,
    });
  });

  it("reports staging scaffold as metadata-only with broker references only", () => {
    const foundation = createQueueProviderPackageBinding({
      env: { CAMPAIGN_OS_REDIS_URL: "redis-ref:staging" },
      profileId: "staging-scaffold",
    });

    expect(foundation.bindingId).toBe("bullmq-redis-package-binding-staging");
    expect(foundation.mode).toBe("metadata_only");
    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.brokerConnectionPosture).toBe("reference_only");
    expect(foundation.sdkClientConstructed).toBe(false);
    expect(foundation.readiness.liveBrokerConnectionAttempted).toBe(false);
    expect(foundation.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.readiness.liveWorkerExecutionEnabled).toBe(false);
  });

  it("fails closed for production-required when package and broker preconditions are missing", () => {
    const foundation = createQueueProviderPackageBinding({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(
      queueProviderPackageProductionPreconditions.length + redisBrokerConnectionProductionPreconditions.length,
    );
    expect(foundation.diagnosticCodes).toEqual([
      "QUEUE_PROVIDER_PACKAGE_MISSING",
      "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING",
      "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING",
      "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING",
      "QUEUE_PROVIDER_PACKAGE_CREDENTIALS_MISSING",
      "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING",
      "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING",
      "QUEUE_PROVIDER_PACKAGE_RETRY_POLICY_MISSING",
      "QUEUE_PROVIDER_PACKAGE_IDEMPOTENCY_STORE_MISSING",
      "QUEUE_PROVIDER_PACKAGE_WORKER_LEASE_MISSING",
      "QUEUE_PROVIDER_PACKAGE_OBSERVABILITY_MISSING",
      "QUEUE_PROVIDER_PACKAGE_RUNBOOK_MISSING",
      "QUEUE_PROVIDER_PACKAGE_LIVE_ENABLEMENT_MISSING",
      ...redisBrokerMissingDiagnosticCodes,
    ]);
    expect(foundation.readiness.brokerConnectionBlockerCount).toBe(redisBrokerConnectionProductionPreconditions.length);
    expect(foundation.readiness.brokerConnectionDiagnosticCodes).toEqual(redisBrokerMissingDiagnosticCodes);
    expect(foundation.readiness.brokerConnectionHealthCheckMode).toBe("activation_required");
    expect(foundation.bullmqConstructionStatus).toBe("blocked");
    expect(foundation.bullmqConstructionDiagnosticCodes).toEqual(
      expect.arrayContaining([
        "BULLMQ_CONSTRUCTION_ACTIVATION_MISSING",
        "BULLMQ_CONSTRUCTION_FACTORY_MISSING",
      ]),
    );
    expect(foundation.readiness.bullmqConstructionStatus).toBe("blocked");
    expect(foundation.readiness.bullmqConstructionQueueClientConstructed).toBe(false);
  });

  it("projects injected BullMQ construction without enabling package live execution", () => {
    const constructionFactory: BullmqConstructionFactory = {
      factoryId: "package-binding-bullmq-construction-factory",
      construct: () => ({
        queueClient: { clientId: "queue-client-ref", constructed: true },
        queueEvents: { clientId: "queue-events-ref", constructed: true },
        worker: { clientId: "worker-client-ref", constructed: true },
      }),
    };

    const foundation = createQueueProviderPackageBinding({
      constructionFactory,
      env: productionReadyConstructionEnv,
      profileId: "production-required",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.bullmqConstructionStatus).toBe("constructed");
    expect(foundation.bullmqConstructionAttempted).toBe(true);
    expect(foundation.bullmqConstructionFactoryInvoked).toBe(true);
    expect(foundation.queueClientConstructed).toBe(true);
    expect(foundation.queueEventsConstructed).toBe(true);
    expect(foundation.workerConstructed).toBe(true);
    expect(foundation.sdkClientConstructed).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.liveWorkerExecutionEnabled).toBe(false);
    expect(foundation.readiness).toMatchObject({
      bullmqConstructionQueueClientConstructed: true,
      bullmqConstructionQueueEventsConstructed: true,
      bullmqConstructionStatus: "constructed",
      bullmqConstructionWorkerConstructed: true,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
      sdkClientConstructed: false,
    });
  });

  it("projects redacted BullMQ factory failures through package binding", () => {
    const constructionFactory: BullmqConstructionFactory = {
      factoryId: "throwing-package-binding-construction-factory",
      construct: () => {
        throw new Error("redis://redis-user:redis-pass@redis.invalid:6379/0 payload={\"wallet\":\"ELF_SECRET\"}");
      },
    };

    const foundation = createQueueProviderPackageBinding({
      constructionFactory,
      env: productionReadyConstructionEnv,
      profileId: "production-required",
    });

    expect(foundation.bullmqConstructionStatus).toBe("failed");
    expect(foundation.bullmqConstructionDiagnosticCodes).toContain("BULLMQ_CONSTRUCTION_FACTORY_FAILED");
    expect(foundation.queueClientConstructed).toBe(false);
    expect(foundation.workerConstructed).toBe(false);
    expect(foundation.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.liveWorkerExecutionEnabled).toBe(false);
    expect(JSON.stringify(foundation)).not.toContain("redis-pass");
    expect(JSON.stringify(foundation)).not.toContain("ELF_SECRET");
  });

  it("keeps production-required scaffolded but not production-ready after all references are present", () => {
    const foundation = createQueueProviderPackageBinding({
      env: productionReadyPackageEnv,
      profileId: "production-required",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.mode).toBe("production_required");
    expect(foundation.bindingId).toBe("bullmq-redis-package-binding-production");
    expect(foundation.brokerConnectionPosture).toBe("reference_only");
    expect(foundation.productionReady).toBe(false);
    expect(foundation.readiness.productionReady).toBe(false);
    expect(foundation.readiness.liveBrokerConnectionAttempted).toBe(false);
    expect(foundation.readiness.liveBrokerHealthCheckAttempted).toBe(false);
    expect(foundation.readiness.brokerConnectionStatus).toBe("scaffolded");
    expect(foundation.readiness.brokerConnectionHealthCheckMode).toBe("metadata_only");
    expect(foundation.readiness.brokerConnectionBlockerCount).toBe(0);
    expect(foundation.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.readiness.liveWorkerExecutionEnabled).toBe(false);
    expect(foundation.readiness.queueClientConstructed).toBe(false);
    expect(foundation.readiness.queueEventsConstructed).toBe(false);
    expect(foundation.readiness.bullmqConstructionStatus).toBe("blocked");
    expect(foundation.readiness.bullmqConstructionFactoryInvoked).toBe(false);
    expect(foundation.sdkClientConstructed).toBe(false);
    expect(foundation.workerConstructed).toBe(false);
  });

  it("rejects unsupported or unsafe package and Redis material without leaking raw values", () => {
    const foundation = createQueueProviderPackageBinding({
      bindingId: "https://redis-user:redis-pass@redis.invalid/0?token=secret",
      env: {
        CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
        CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq?token=secret",
        CAMPAIGN_OS_REDIS_URL: "redis://redis-user:redis-pass@redis.invalid:6379/0?token=secret",
      },
      family: "bullmq-redis-compatible",
      profileId: "staging-scaffold",
    });

    expect(foundation.valid).toBe(false);
    expect(foundation.status).toBe("blocked");
    expect(foundation.diagnosticCodes).toEqual(
      expect.arrayContaining(["UNSAFE_QUEUE_PROVIDER_PACKAGE_BINDING_CONFIG"]),
    );
    expect(JSON.stringify(foundation)).not.toContain("redis-pass");
    expect(JSON.stringify(foundation)).not.toContain("token=secret");
    expect(foundation.sdkClientConstructed).toBe(false);
    expect(foundation.liveBrokerConnectionAttempted).toBe(false);
  });

  it("redacts credentials, wallet addresses, object keys, signed URLs, webhooks, lease tokens, idempotency keys, and payload fragments", () => {
    const redacted = redactQueueProviderPackageValue({
      credentialRef: "redis://redis-user:redis-pass@redis.invalid:6379/0",
      idempotencyKey: "idempotency-key-secret",
      leaseToken: "lease-token-secret",
      objectKey: "s3://bucket/private/object",
      payloadFragment: "{\"wallet\":\"ELF_ABC_private\",\"payload\":true}",
      providerResponse: "Bearer secret-token",
      signedUrl: "https://files.invalid/report.csv?X-Amz-Signature=abc",
      webhookSecret: "hook-secret-value",
      walletAddress: "ELF_ABC_private",
    });

    expect(redacted).toEqual({
      credentialRef: "[redacted]",
      idempotencyKey: "[redacted]",
      leaseToken: "[redacted]",
      objectKey: "[redacted]",
      payloadFragment: "[redacted]",
      providerResponse: "[redacted]",
      signedUrl: "[redacted]",
      webhookSecret: "[redacted]",
      walletAddress: "[redacted]",
    });
  });

  it("does not expose a registration for unknown package bindings", () => {
    expect(getQueueProviderPackageBindingRegistration("unknown-package-binding")).toBeUndefined();
  });
});
