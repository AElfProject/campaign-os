import { describe, expect, it } from "vitest";
import type { BullmqConstructionFactory } from "./bullmqConstructionReadiness";
import {
  createLiveQueuePublishingReadiness,
  type LiveQueuePublisher,
} from "./liveQueuePublishingReadiness";
import {
  SUPPORTED_QUEUE_PROVIDER_DRIVER_PROFILES,
  createQueueProviderDriverFoundation,
  executeLocalFakeQueueProviderOperation,
  getQueueProviderDriverRegistration,
  queueProviderDriverNoLiveFlags,
  queueProviderDriverOperationCapabilities,
  queueProviderDriverProductionPreconditions,
  redactQueueProviderDriverValue,
} from "./queueProviderDriver";
import {
  queueProviderSdkBindingOperationCapabilities,
  queueProviderSdkBindingProductionPreconditions,
} from "./queueProviderSdkBinding";
import { queueProviderPackageProductionPreconditions } from "./queueProviderPackageBinding";
import { redisBrokerConnectionProductionPreconditions } from "./redisBrokerConnectionReadiness";

const productionReadyBrokerEnv = {
  CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "circuit-breaker:fail-closed",
  CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "2500",
  CAMPAIGN_OS_REDIS_CREDENTIALS: "credential-ref:redis-broker",
  CAMPAIGN_OS_REDIS_DATABASE: "database-ref:0",
  CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "retry-backoff:exponential",
  CAMPAIGN_OS_REDIS_TLS_POLICY: "tls-policy:required",
} satisfies Record<string, unknown>;

const productionReadyPublishingEnv = {
  ...productionReadyBrokerEnv,
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY: "test-bullmq-construction-factory",
  CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:review",
  CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
  CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
  CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER: "test-live-queue-publisher",
  CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
  CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-provider",
  CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY: "payload-reference-policy:hash-or-reference",
  CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY: "publisher-redaction:strict",
  CAMPAIGN_OS_QUEUE_PROVIDER_BINDING: "production-provider-sdk-binding",
  CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-provider",
  CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "production-provider-driver",
  CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "queue-endpoint-ref:provider",
  CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
  CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE: "package-ref:@provider/queue-sdk",
  CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
  CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:review",
  CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
  CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
} satisfies Record<string, unknown>;

const constructionFactory: BullmqConstructionFactory = {
  construct: () => ({
    queueClient: { clientId: "queue-client-ref", constructed: true, optionReferenceId: "queue-options-ref" },
    queueEvents: { clientId: "queue-events-ref", constructed: true, optionReferenceId: "events-options-ref" },
    worker: { clientId: "worker-client-ref", constructed: true, optionReferenceId: "worker-options-ref" },
  }),
  factoryId: "test-bullmq-construction-factory",
};

describe("queue provider driver foundation", () => {
  it("declares a stable local fake registration and supported operations", () => {
    const foundation = createQueueProviderDriverFoundation();
    const registration = getQueueProviderDriverRegistration("local-fake-queue-provider-driver");

    expect(foundation.id).toBe("campaign-os-queue-provider-driver-foundation");
    expect(SUPPORTED_QUEUE_PROVIDER_DRIVER_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
    expect(registration).toMatchObject({
      driverId: "local-fake-queue-provider-driver",
      providerId: "local-fake",
      status: "local_ready",
    });
    expect(foundation.operationCapabilities.map((item) => item.operation)).toEqual([
      "publish",
      "delayed_publish",
      "ack",
      "nack",
      "retry",
      "dead_letter",
      "lease_handoff",
      "metrics",
    ]);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
  });

  it("keeps local review deterministic, valid, fast, and no-live", () => {
    const startedAt = performance.now();
    const foundation = createQueueProviderDriverFoundation({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.providerId).toBe("local-fake");
    expect(foundation.driverId).toBe("local-fake-queue-provider-driver");
    expect(foundation.mode).toBe("dry_run");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(queueProviderDriverNoLiveFlags);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.readiness).toMatchObject({
      activationGateSatisfied: false,
      blockerCount: 0,
      consumeAckAttempted: false,
      consumeAttemptPolicy: "disabled_no_live",
      consumeDeadLetterAttempted: false,
      consumeNackAttempted: false,
      consumeRequestEvaluated: false,
      consumeResultStatus: "not_requested",
      consumeRetryScheduled: false,
      consumingActivationStatus: "disabled",
      consumingBlockerCount: 0,
      consumingConsumerId: "not_configured",
      consumingConsumerProvided: false,
      consumingHandlerRegistryProvided: false,
      consumingLiveConsumeAttempted: false,
      consumingLiveQueueConsumptionEnabled: false,
      consumingProductionReady: false,
      consumingStatus: "disabled",
      deadLetterRouteCount: foundation.deadLetterRoutes.length,
      disabledLiveOperationCount: queueProviderDriverOperationCapabilities.length,
      liveQueueConsumptionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      operationCount: queueProviderDriverOperationCapabilities.length,
      productionReady: false,
      publishAttemptPolicy: "disabled_no_live",
      publishRequestEvaluated: false,
      publishResultStatus: "not_requested",
      publishingActivationStatus: "disabled",
      publishingBlockerCount: 0,
      publishingLivePublishAttempted: false,
      publishingLiveQueuePublishingEnabled: false,
      publishingPublisherId: "not_configured",
      publishingPublisherProvided: false,
      publishingStatus: "disabled",
      queueRouteCount: foundation.queueRoutes.length,
      sdkBinding: expect.objectContaining({
        bindingId: "local-stub-queue-provider-sdk-binding",
        blockerCount: 0,
        disabledLiveOperationCount: queueProviderSdkBindingOperationCapabilities.length,
        liveProviderCallAttempted: false,
        liveQueuePublishingEnabled: false,
        liveWorkerExecutionEnabled: false,
        mode: "dry_run",
        operationCount: queueProviderSdkBindingOperationCapabilities.length,
        packageBindingBullmqConstructionAttempted: false,
        packageBindingBullmqConstructionBlockerCount: 0,
        packageBindingBullmqConstructionDiagnosticCodes: [],
        packageBindingBullmqConstructionFactoryInvoked: false,
        packageBindingBullmqConstructionId: "bullmq-construction-local",
        packageBindingBullmqConstructionProductionReady: false,
        packageBindingBullmqConstructionStatus: "local_ready",
        packageBindingQueueClientConstructed: false,
        packageBindingQueueEventsConstructed: false,
        packageBindingSdkClientConstructed: false,
        packageBindingWorkerConstructed: false,
        packageBinding: expect.objectContaining({
          bindingId: "bullmq-redis-package-binding-local",
          bullmqConstructionAttempted: false,
          bullmqConstructionBlockerCount: 0,
          bullmqConstructionDiagnosticCodes: [],
          bullmqConstructionFactoryInvoked: false,
          bullmqConstructionId: "bullmq-construction-local",
          bullmqConstructionStatus: "local_ready",
          browserBundleAllowed: false,
          family: "bullmq-redis-compatible",
          liveBrokerConnectionAttempted: false,
          packageName: "bullmq",
          packageRef: "npm:bullmq",
          productionReady: false,
          sdkClientConstructed: false,
          status: "local_ready",
          valid: true,
        }),
        productionReady: false,
        providerKind: "local-stub",
        sdkClientConstructed: false,
        sdkPackageRef: "local-stub-sdk-package",
        status: "local_ready",
        valid: true,
      }),
      valid: true,
    });
    expect(foundation.consumingReadiness).toMatchObject({
      activationStatus: "disabled",
      consumeAttemptAllowed: false,
      consumerId: "not_configured",
      consumerProvided: false,
      handlerRegistryProvided: false,
      liveQueueConsumptionEnabled: false,
      mode: "dry_run",
      productionReady: false,
      status: "disabled",
      valid: true,
    });
    expect(foundation.consumePosture).toMatchObject({
      ackAttempted: false,
      attemptPolicy: "disabled_no_live",
      deadLetterAttempted: false,
      liveConsumeAttempted: false,
      nackAttempted: false,
      productionWriteAttempted: false,
      consumeRequestEvaluated: false,
      resultStatus: "not_requested",
      retryScheduled: false,
      workerExecutionAttempted: false,
    });
    expect(Object.values(foundation.consumePosture.noLiveSideEffects).every((value) => value === false)).toBe(true);
    expect(foundation.publishingReadiness).toMatchObject({
      activationStatus: "disabled",
      liveQueuePublishingEnabled: false,
      mode: "dry_run",
      publishAttemptAllowed: false,
      publisherId: "not_configured",
      publisherProvided: false,
      status: "disabled",
      valid: true,
    });
    expect(foundation.publishPosture).toMatchObject({
      attemptPolicy: "disabled_no_live",
      idempotencyReferenceRequired: true,
      livePublishAttempted: false,
      payloadReferenceOrHashRequired: true,
      productionWriteAttempted: false,
      publishRequestEvaluated: false,
      published: false,
      resultStatus: "not_requested",
      safeIdempotencyReferenceRequired: true,
      safePayloadReferenceRequired: true,
    });
    expect(Object.values(foundation.publishPosture.noLiveSideEffects).every((value) => value === false)).toBe(true);
    expect(foundation.sdkBinding).toMatchObject({
      bindingId: "local-stub-queue-provider-sdk-binding",
      liveProviderCallAttempted: false,
      mode: "dry_run",
      packageBinding: expect.objectContaining({
        bindingId: "bullmq-redis-package-binding-local",
        liveBrokerConnectionAttempted: false,
        packageName: "bullmq",
        productionReady: false,
        sdkClientConstructed: false,
        status: "local_ready",
      }),
      providerKind: "local-stub",
      sdkClientConstructed: false,
      status: "local_ready",
      valid: true,
    });
  });

  it("reports staging scaffold as metadata-only without live publishing", () => {
    const foundation = createQueueProviderDriverFoundation({
      driverId: "metadata-only-queue-provider-driver",
      profileId: "staging-scaffold",
      providerId: "metadata-only",
    });

    expect(foundation.mode).toBe("metadata_only");
    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.readiness.liveQueueConsumptionEnabled).toBe(false);
    expect(foundation.readiness.liveWorkerExecutionEnabled).toBe(false);
    expect(foundation.readiness.consumingActivationStatus).toBe("metadata_only");
    expect(foundation.readiness.consumingStatus).toBe("scaffolded");
    expect(foundation.consumePosture.attemptPolicy).toBe("disabled_no_live");
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
    expect(foundation.sdkBinding).toMatchObject({
      bindingId: "metadata-only-queue-provider-sdk-binding",
      mode: "metadata_only",
      providerKind: "redis-compatible",
      packageBinding: expect.objectContaining({
        bindingId: "bullmq-redis-package-binding-staging",
        mode: "metadata_only",
        packageName: "bullmq",
        status: "scaffolded",
        valid: true,
      }),
      sdkClientConstructed: false,
      sdkPackageRef: "metadata-only-sdk-package",
      status: "scaffolded",
      valid: true,
    });
  });

  it("fails closed for production-required when preconditions and activation are missing", () => {
    const foundation = createQueueProviderDriverFoundation({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(
      queueProviderDriverProductionPreconditions.length
      + queueProviderSdkBindingProductionPreconditions.length
      + queueProviderPackageProductionPreconditions.length
      + redisBrokerConnectionProductionPreconditions.length,
    );
    expect(foundation.diagnosticCodes).toEqual([
      "QUEUE_PROVIDER_DRIVER_MISSING",
      "QUEUE_PROVIDER_DRIVER_ENDPOINT_MISSING",
      "QUEUE_PROVIDER_DRIVER_CREDENTIALS_MISSING",
      "QUEUE_PROVIDER_DRIVER_QUEUE_ROUTE_MISSING",
      "QUEUE_PROVIDER_DRIVER_DEAD_LETTER_ROUTE_MISSING",
      "QUEUE_PROVIDER_DRIVER_RETRY_POLICY_MISSING",
      "QUEUE_PROVIDER_DRIVER_IDEMPOTENCY_STORE_MISSING",
      "QUEUE_PROVIDER_DRIVER_WORKER_LEASE_MISSING",
      "QUEUE_PROVIDER_DRIVER_OBSERVABILITY_MISSING",
      "QUEUE_PROVIDER_DRIVER_RUNBOOK_MISSING",
      "QUEUE_PROVIDER_DRIVER_LIVE_ENABLEMENT_MISSING",
      "QUEUE_PROVIDER_SDK_PACKAGE_MISSING",
      "QUEUE_PROVIDER_SDK_BINDING_MISSING",
      "QUEUE_PROVIDER_DRIVER_MISSING",
      "QUEUE_PROVIDER_SDK_ENDPOINT_MISSING",
      "QUEUE_PROVIDER_SDK_CREDENTIALS_MISSING",
      "QUEUE_PROVIDER_SDK_QUEUE_ROUTE_MISSING",
      "QUEUE_PROVIDER_SDK_DEAD_LETTER_ROUTE_MISSING",
      "QUEUE_PROVIDER_SDK_RETRY_POLICY_MISSING",
      "QUEUE_PROVIDER_SDK_IDEMPOTENCY_STORE_MISSING",
      "QUEUE_PROVIDER_SDK_WORKER_LEASE_MISSING",
      "QUEUE_PROVIDER_SDK_OBSERVABILITY_MISSING",
      "QUEUE_PROVIDER_SDK_RUNBOOK_MISSING",
      "QUEUE_PROVIDER_SDK_LIVE_ENABLEMENT_MISSING",
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
    ]);
    expect(foundation.sdkBinding.status).toBe("blocked");
    expect(foundation.sdkBinding.sdkClientConstructed).toBe(false);
    expect(foundation.sdkBinding.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.sdkBinding.packageBinding.status).toBe("blocked");
    expect(foundation.sdkBinding.packageBinding.liveBrokerConnectionAttempted).toBe(false);
    expect(foundation.sdkBinding.packageBinding.bullmqConstructionStatus).toBe("blocked");
    expect(foundation.sdkBinding.packageBinding.bullmqConstructionAttempted).toBe(false);
    expect(foundation.sdkBinding.packageBinding.bullmqConstructionFactoryInvoked).toBe(false);
    expect(foundation.sdkBinding.packageBinding.queueClientConstructed).toBe(false);
    expect(foundation.sdkBinding.packageBinding.queueEventsConstructed).toBe(false);
    expect(foundation.sdkBinding.packageBinding.workerConstructed).toBe(false);
  });

  it("keeps production-required scaffolded but not production-ready after all gates are explicit", () => {
    const foundation = createQueueProviderDriverFoundation({
      env: {
        ...productionReadyBrokerEnv,
        CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:review",
        CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
        CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
        CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
        CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_BINDING: "production-provider-sdk-binding",
        CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "production-provider-driver",
        CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "queue-endpoint-ref:provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
        CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
        CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
        CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE: "package-ref:@provider/queue-sdk",
        CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
        CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:review",
        CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
        CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
      },
      profileId: "production-required",
      providerId: "production-queue-provider",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.driverId).toBe("production-provider-driver");
    expect(foundation.readiness.activationGateSatisfied).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.readiness.productionReady).toBe(false);
    expect(foundation.readiness.liveQueueConsumptionEnabled).toBe(false);
    expect(foundation.readiness.consumingActivationStatus).toBe("activation_required");
    expect(foundation.readiness.consumingStatus).toBe("blocked");
    expect(foundation.consumePosture).toMatchObject({
      attemptPolicy: "blocked_until_ready",
      liveConsumeAttempted: false,
      workerExecutionAttempted: false,
    });
    expect(foundation.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.readiness.liveWorkerExecutionEnabled).toBe(false);
    expect(foundation.sdkBinding).toMatchObject({
        bindingId: "production-provider-sdk-binding",
        brokerConnectionBlockerCount: 0,
        brokerConnectionHealthCheckMode: "metadata_only",
        brokerConnectionStatus: "scaffolded",
        blockerCount: 0,
        liveProviderCallAttempted: false,
        packageBindingBullmqConstructionAttempted: false,
        packageBindingBullmqConstructionBlockerCount: 2,
        packageBindingBullmqConstructionDiagnosticCodes: [
          "BULLMQ_CONSTRUCTION_ACTIVATION_MISSING",
          "BULLMQ_CONSTRUCTION_FACTORY_MISSING",
        ],
        packageBindingBullmqConstructionFactoryInvoked: false,
        packageBindingBullmqConstructionId: "bullmq-construction-production",
        packageBindingBullmqConstructionProductionReady: false,
        packageBindingBullmqConstructionStatus: "blocked",
        packageBindingQueueClientConstructed: false,
        packageBindingQueueEventsConstructed: false,
        packageBindingSdkClientConstructed: false,
        packageBindingWorkerConstructed: false,
      mode: "production_required",
        packageBinding: expect.objectContaining({
          bindingId: "bullmq-redis-package-binding-production",
          blockerCount: 0,
          brokerConnectionBlockerCount: 0,
          brokerConnectionHealthCheckMode: "metadata_only",
          brokerConnectionStatus: "scaffolded",
          bullmqConstructionAttempted: false,
          bullmqConstructionBlockerCount: 2,
          bullmqConstructionDiagnosticCodes: [
            "BULLMQ_CONSTRUCTION_ACTIVATION_MISSING",
            "BULLMQ_CONSTRUCTION_FACTORY_MISSING",
          ],
          bullmqConstructionFactoryInvoked: false,
          bullmqConstructionId: "bullmq-construction-production",
          bullmqConstructionStatus: "blocked",
          liveBrokerConnectionAttempted: false,
          liveBrokerHealthCheckAttempted: false,
          packageName: "bullmq",
          productionReady: false,
          queueClientConstructed: false,
          queueEventsConstructed: false,
          sdkClientConstructed: false,
          status: "scaffolded",
          valid: true,
          workerConstructed: false,
        }),
      productionReady: false,
      providerKind: "redis-compatible",
      sdkClientConstructed: false,
      sdkPackageRef: "package-ref:@provider/queue-sdk",
      status: "scaffolded",
      valid: true,
    });
  });

  it("accepts deterministic local fake operation metadata for all supported operations", () => {
    const startedAt = performance.now();
    const results = queueProviderDriverOperationCapabilities.map((capability) =>
      executeLocalFakeQueueProviderOperation({
        attempt: 1,
        idempotencyKey: "idem:task-verification:001",
        jobId: "task-verification-worker",
        operation: capability.operation,
        payloadReference: "payload-ref:task-verification:001",
        providerResponseReference: "provider-response-ref:local-fake:001",
        queueId: "verification-jobs",
        requestedAt: "2026-07-07T22:31:21Z",
        traceId: "trace:queue-provider-driver:001",
      }),
    );
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(results.every((item) => item.accepted)).toBe(true);
    expect(results.map((item) => item.status)).toEqual(
      queueProviderDriverOperationCapabilities.map(() => "accepted_local_fake"),
    );
    expect(results[0]).toMatchObject({
      driverId: "local-fake-queue-provider-driver",
      idempotencyKey: "idem:task-verification:001",
      livePublishAttempted: false,
      operationId: "local-fake:publish:verification-jobs:task-verification-worker:attempt-1",
      payloadReference: "payload-ref:task-verification:001",
      productionWriteAttempted: false,
      providerId: "local-fake",
      queueId: "verification-jobs",
      traceId: "trace:queue-provider-driver:001",
    });
  });

  it("rejects unsafe or unknown local fake operation requests", () => {
    const result = executeLocalFakeQueueProviderOperation({
      attempt: 0,
      deadLetterReason: "https://queue-user:queue-pass@queue.invalid/dead-letter?token=secret",
      idempotencyKey: "idempotency-key-secret",
      jobId: "unknown-worker",
      operation: "publish",
      payloadReference: "{\"wallet\":\"ELF_ABC_private\",\"payload\":true}",
      providerResponseReference: "provider-response:Bearer secret-token",
      queueId: "unknown-queue",
      requestedAt: "not-a-date",
      traceId: " ",
    });

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "UNKNOWN_QUEUE_ID",
        "UNKNOWN_QUEUE_JOB",
        "MISSING_TRACE_ID",
        "INVALID_ATTEMPT",
        "UNSAFE_PAYLOAD_REFERENCE",
        "UNSAFE_IDEMPOTENCY_KEY",
        "INVALID_PROVIDER_TIMESTAMP",
        "UNSAFE_DEAD_LETTER_REASON",
        "UNSAFE_PROVIDER_RESPONSE_REFERENCE",
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(JSON.stringify(result)).not.toContain("ELF_ABC_private");
  });

  it("blocks production-required operation attempts while gates are missing", () => {
    const foundation = createQueueProviderDriverFoundation({ profileId: "production-required" });
    const result = executeLocalFakeQueueProviderOperation(
      {
        attempt: 1,
        idempotencyKey: "idem:task-verification:001",
        jobId: "task-verification-worker",
        operation: "publish",
        payloadReference: "payload-ref:task-verification:001",
        queueId: "verification-jobs",
        traceId: "trace:queue-provider-driver:001",
      },
      { foundation },
    );

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("blocked_by_gate");
    expect(result.livePublishAttempted).toBe(false);
    expect(result.productionWriteAttempted).toBe(false);
    expect(result.diagnosticCodes).toContain("QUEUE_PROVIDER_DRIVER_LIVE_ENABLEMENT_MISSING");
  });

  it("projects live publishing readiness and accepted publish posture without enabling worker execution", () => {
    const publisher: LiveQueuePublisher = {
      publish: () => ({
        operationId: "publish-verification-jobs-task-verification-worker",
        providerReference: "provider-ref:accepted",
        status: "accepted",
      }),
      publisherId: "test-live-queue-publisher",
    };
    const liveQueuePublishingReadiness = createLiveQueuePublishingReadiness({
      constructionFactory,
      env: productionReadyPublishingEnv,
      profileId: "production-required",
      publisher,
    });
    const foundation = createQueueProviderDriverFoundation({
      env: productionReadyPublishingEnv,
      liveQueuePublishingReadiness,
      liveQueuePublishRequest: {
        attempt: 1,
        idempotencyReference: "idem-ref:campaign-task-1",
        jobId: "task-verification-worker",
        payloadReference: "payload-ref:task-1",
        queueId: "verification-jobs",
        traceId: "trace-live-publish-driver",
      },
      liveQueuePublisher: publisher,
      profileId: "production-required",
      providerId: "production-queue-provider",
    });

    expect(foundation.publishingReadiness).toMatchObject({
      activationStatus: "explicitly_enabled",
      liveQueuePublishingEnabled: true,
      mode: "production_required",
      publishAttemptAllowed: true,
      publisherId: "test-live-queue-publisher",
      publisherProvided: true,
      status: "ready",
      valid: true,
    });
    expect(foundation.publishingReadiness.diagnosticCodes).toEqual([]);
    expect(foundation.publishPosture).toMatchObject({
      attemptPolicy: "request_evaluated",
      livePublishAttempted: true,
      productionWriteAttempted: false,
      publishRequestEvaluated: true,
      published: true,
      resultStatus: "accepted",
    });
    expect(foundation.readiness).toMatchObject({
      publishAttemptPolicy: "request_evaluated",
      publishRequestEvaluated: true,
      publishResultStatus: "accepted",
      publishingActivationStatus: "explicitly_enabled",
      publishingLivePublishAttempted: true,
      publishingLiveQueuePublishingEnabled: true,
      publishingPublisherProvided: true,
      publishingStatus: "ready",
    });
    expect(foundation.readiness.liveWorkerExecutionEnabled).toBe(false);
    expect(Object.values(foundation.readiness.publishingNoLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("projects duplicate publish results from an injected ready publishing boundary", () => {
    const publisher: LiveQueuePublisher = {
      publish: () => ({
        diagnosticCodes: ["LIVE_QUEUE_DUPLICATE_IDEMPOTENCY_REFERENCE"],
        status: "duplicate",
      }),
      publisherId: "duplicate-live-queue-publisher",
    };
    const liveQueuePublishingReadiness = createLiveQueuePublishingReadiness({
      constructionFactory,
      env: productionReadyPublishingEnv,
      profileId: "production-required",
      publisher,
    });
    const foundation = createQueueProviderDriverFoundation({
      env: productionReadyPublishingEnv,
      liveQueuePublishingReadiness,
      liveQueuePublishRequest: {
        attempt: 1,
        idempotencyReference: "idem-ref:duplicate",
        jobId: "task-verification-worker",
        payloadReference: "payload-ref:task-1",
        queueId: "verification-jobs",
        traceId: "trace-live-publish-duplicate",
      },
      liveQueuePublisher: publisher,
      profileId: "production-required",
      providerId: "production-queue-provider",
    });

    expect(foundation.publishingReadiness.publisherId).toBe("duplicate-live-queue-publisher");
    expect(foundation.publishPosture.resultStatus).toBe("duplicate");
    expect(foundation.publishPosture.livePublishAttempted).toBe(true);
    expect(foundation.publishPosture.published).toBe(false);
    expect(foundation.publishPosture.diagnosticCodes).toContain("LIVE_QUEUE_DUPLICATE_IDEMPOTENCY_REFERENCE");
  });

  it("redacts unsafe provider, queue, credential, payload, and response material", () => {
    const redacted = redactQueueProviderDriverValue({
      credential: "Bearer queue-secret-token",
      endpoint: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
      idempotencyKey: "idempotency-key-secret",
      leaseToken: "lease-token-secret",
      objectKey: "exports/private-winners.csv",
      payload: "{\"wallet\":\"ELF_ABC_private\",\"payload\":true}",
      providerResponse: "provider-response-fragment:secret",
      sdkPackageRef: "https://registry.invalid/@scope/pkg?token=sdk-secret",
      signedUrl: "https://storage.invalid/file.csv?X-Amz-Signature=signed-url-secret",
      walletAddress: "ELF_ABC_private",
    });
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret-token");
    expect(serialized).not.toContain("idempotency-key-secret");
    expect(serialized).not.toContain("lease-token-secret");
    expect(serialized).not.toContain("private-winners");
    expect(serialized).not.toContain("sdk-secret");
    expect(serialized).not.toContain("ELF_ABC_private");
    expect(serialized).toContain("[redacted]");
  });
});
