import { describe, expect, it, vi } from "vitest";
import {
  createAdvancedAnalyticsReadiness,
  createCampaignLifecycleOperations,
  createContractTransparencyMonitor,
  createExportFulfillmentReadiness,
} from "../domain/campaign";
import { campaignDetail } from "../domain/fixtures";
import { createAuthSessionReadinessReport } from "./authSession";
import { createProviderIndexerFoundation } from "./providerIndexerAdapters";
import * as queueRuntime from "./queueRuntime";
import {
  createSchedulerRuntimeFoundation,
  dryRunSchedulerTrigger,
  redactSchedulerRuntimeValue,
  schedulerRuntimeRegistrations,
} from "./schedulerRuntime";
import { createVerificationSourceHandoff } from "./verificationSourceHandoff";
import {
  createWorkerLeaseStoreFoundation,
  evaluateWorkerLeaseDryRun,
  workerLeaseStoreNoLiveFlags,
} from "./workerLeaseStore";
import {
  createWorkerIdempotencyStoreFoundation,
  evaluateWorkerIdempotencyDryRun,
  workerIdempotencyStoreNoLiveFlags,
} from "./workerIdempotencyStore";
import {
  createLiveQueuePublishingReadiness,
  type LiveQueuePublisher,
} from "./liveQueuePublishingReadiness";
import {
  createLiveQueueConsumeLoopReadiness,
  evaluateLiveQueueConsumeMessage,
  type LiveQueueConsumer,
  type LiveQueueHandler,
} from "./liveQueueConsumeLoop";
import {
  createProviderIndexerClientReadiness,
  evaluateProviderVerificationRequest,
} from "./providerIndexerClientReadiness";
import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import { createQueueProviderPackageBinding } from "./queueProviderPackageBinding";
import { createWorkerSchedulerFoundation } from "./workerSchedulerRuntime";
import type { BullmqConstructionFactory } from "./bullmqConstructionReadiness";

const redisBrokerConnectionReadyEnv = {
  CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "circuit-closed",
  CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "500",
  CAMPAIGN_OS_REDIS_CREDENTIALS: "redis-auth-ref:campaign-os",
  CAMPAIGN_OS_REDIS_DATABASE: "redis-db-0",
  CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "retry-exponential",
  CAMPAIGN_OS_REDIS_TLS_POLICY: "tls-required",
} satisfies Record<string, unknown>;

const bullmqConstructionReadyEnv = {
  ...redisBrokerConnectionReadyEnv,
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY: "factory-ref:bullmq-construction",
  CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:queue-package",
  CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
  CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:queue-package",
  CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER: "test-live-queue-publisher",
  CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:queue-package",
  CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-package",
  CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY: "payload-reference-policy:hash-or-reference",
  CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY: "publisher-redaction:strict",
  CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-package",
  CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
  CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
  CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:queue-package",
  CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:queue-package",
  CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
} satisfies Record<string, unknown>;

const constructedBullmqFactory: BullmqConstructionFactory = {
  factoryId: "scheduler-separation-bullmq-construction-factory",
  construct: () => ({
    queueClient: { clientId: "queue-client-ref", constructed: true },
    queueEvents: { clientId: "queue-events-ref", constructed: true },
    worker: { clientId: "worker-client-ref", constructed: true },
  }),
};

const liveQueuePublisher: LiveQueuePublisher = {
  publish: () => ({
    operationId: "publish-verification-jobs-task-verification-worker",
    providerReference: "provider-ref:accepted",
    status: "accepted",
  }),
  publisherId: "test-live-queue-publisher",
};

const liveQueueConsumer: LiveQueueConsumer = {
  ack: () => ({ operationId: "ack-verification-jobs-task-verification-worker", status: "accepted" }),
  consumerId: "test-live-queue-consumer",
  deadLetter: () => ({ operationId: "dead-letter-verification-jobs-task-verification-worker", status: "accepted" }),
  nack: () => ({ operationId: "nack-verification-jobs-task-verification-worker", status: "accepted" }),
  reserve: () => ({ operationId: "reserve-verification-jobs-task-verification-worker", status: "accepted" }),
  retry: () => ({ operationId: "retry-verification-jobs-task-verification-worker", status: "accepted" }),
};

const liveQueueHandlers: LiveQueueHandler[] = [
  {
    handle: () => ({ operationId: "handle-verification-jobs-task-verification-worker", status: "completed" }),
    handlerId: "test-live-queue-handler",
    jobIds: ["task-verification-worker"],
  },
];

const consumeReadyEnv = {
  ...bullmqConstructionReadyEnv,
  CAMPAIGN_OS_CONSUME_HANDLER_REGISTRY: "handler-registry-ref:consume",
  CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_LIVE_QUEUE_CONSUMER: "test-live-queue-consumer",
  CAMPAIGN_OS_RETRY_POLICY: "retry:exponential",
} satisfies Record<string, unknown>;

const providerHttpReadyEnv = {
  CAMPAIGN_OS_PROVIDER_HTTP_CREDENTIAL_REF: "credential-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REF: "config-ref:provider-http-endpoint",
  CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REGISTRY_REF: "config-ref:provider-http-registry",
  CAMPAIGN_OS_PROVIDER_HTTP_HEADER_REF: "header-ref:provider-http-auth",
  CAMPAIGN_OS_PROVIDER_HTTP_IDEMPOTENCY_REF: "idem-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_LEASE_REF: "lease-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_QUEUE_WORKER_HANDOFF: "config-ref:provider-http-worker",
  CAMPAIGN_OS_PROVIDER_HTTP_REDACTION_POLICY: "policy-ref:provider-http-redaction",
  CAMPAIGN_OS_PROVIDER_HTTP_RESPONSE_MAPPING_POLICY: "policy-ref:provider-http-response-map",
  CAMPAIGN_OS_PROVIDER_HTTP_RUNBOOK_REF: "runbook-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_PROVIDER_HTTP_TIMEOUT_POLICY: "timeout-policy:2500ms",
  CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM: "config-ref:provider-http-transport",
} satisfies Record<string, unknown>;

const serializedSchedulerOutput = () => {
  const foundation = createSchedulerRuntimeFoundation();
  const acceptedTrigger = dryRunSchedulerTrigger({
    idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
    jobId: "task-verification-worker",
    queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
    scheduleId: "task-verification-on-request",
    scheduledFor: "2026-07-07T13:30:00Z",
    traceId: "trace-scheduler-separation",
    triggerSource: "api_request",
    windowEnd: "2026-07-07T13:35:00Z",
    windowStart: "2026-07-07T13:25:00Z",
  });

  return JSON.stringify({ acceptedTrigger, foundation, registrations: schedulerRuntimeRegistrations });
};

describe("scheduler runtime separation boundaries", () => {
  it("keeps scheduler registrations as queue handoff metadata without queue publishing", () => {
    const scheduler = createSchedulerRuntimeFoundation();
    const queue = queueRuntime.createQueueRuntimeFoundation();

    expect(scheduler.id).toBe("campaign-os-scheduler-runtime-foundation");
    expect(queue.id).toBe("campaign-os-queue-runtime-foundation");
    expect(scheduler.readiness.registrationCount).toBe(9);
    expect(queue.readiness.queuePlanCount).toBe(9);
    expect(scheduler.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(queue.readiness.liveQueuePublishingEnabled).toBe(false);

    for (const registration of scheduler.registrations) {
      expect(registration.queueHandoff.queueRuntimeId).toBe(queue.id);
      expect(registration.queueHandoff.queuePlanId).toMatch(/-queue-plan$/);
      expect(registration.queueHandoff.liveQueuePublishingEnabled).toBe(false);
      expect(registration.liveQueuePublishingEnabled).toBe(false);
      expect(registration.liveSchedulerExecutionEnabled).toBe(false);
      expect(registration.liveCronExecutionEnabled).toBe(false);
    }

    const triggerResult = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-scheduler-separation",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });

    const enqueueSpy = vi.spyOn(queueRuntime, "dryRunQueueEnqueue");

    expect(enqueueSpy).not.toHaveBeenCalled();
    expect(triggerResult.accepted).toBe(true);
    expect(triggerResult).toMatchObject({
      liveExecutionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });

    const queueResult = queueRuntime.dryRunQueueEnqueue({
      attempt: 1,
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      payloadReference: "payload-ref:sha256:task-verification-safe",
      queueId: "verification-jobs",
      requestedAt: "2026-07-07T13:30:00Z",
      traceId: "trace-queue-separation",
    });

    expect(enqueueSpy).toHaveBeenCalledOnce();
    expect(queueResult.accepted).toBe(true);
    expect(queueResult.livePublishAttempted).toBe(false);
    expect(queueResult.liveQueuePublishingEnabled).toBe(false);
    enqueueSpy.mockRestore();
  });

  it("does not infer scheduler or live queue execution from provider adapter metadata", () => {
    const scheduler = createSchedulerRuntimeFoundation();
    const queue = queueRuntime.createQueueRuntimeFoundation({
      profileId: "staging-scaffold",
      providerId: "metadata-only",
    });
    const triggerResult = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-provider-separation",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });

    expect(queue.providerAdapter).toMatchObject({
      liveQueuePublishingEnabled: false,
      mode: "metadata_only",
      productionReady: false,
      providerId: "metadata-only",
      status: "scaffolded",
    });
    expect(queue.providerAdapter.operationCapabilities.every((capability) => capability.liveEnabled === false)).toBe(
      true,
    );
    expect(queue.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(scheduler.readiness.liveCronExecutionEnabled).toBe(false);
    expect(scheduler.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(scheduler.readiness.liveSchedulerExecutionEnabled).toBe(false);
    expect(triggerResult.accepted).toBe(true);
    expect(triggerResult.liveCronExecutionEnabled).toBe(false);
    expect(triggerResult.liveExecutionAttempted).toBe(false);
    expect(triggerResult.liveQueuePublishingEnabled).toBe(false);
    expect(triggerResult.liveSchedulerExecutionEnabled).toBe(false);
  });

  it("does not infer scheduler or live broker execution from package binding metadata", () => {
    const scheduler = createSchedulerRuntimeFoundation();
    const queue = queueRuntime.createQueueRuntimeFoundation({
      env: {
        ...redisBrokerConnectionReadyEnv,
        CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:queue-package",
        CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
        CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:queue-package",
        CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:queue-package",
        CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-package",
        CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-package",
        CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
        CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
        CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
        CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
        CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:queue-package",
        CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:queue-package",
        CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
      },
      profileId: "production-required",
      providerId: "metadata-only",
    });
    const triggerResult = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-package-binding-separation",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });

    expect(queue.providerAdapter.driverSdkBinding.packageBinding).toMatchObject({
      browserBundleAllowed: false,
      liveBrokerConnectionAttempted: false,
      liveBrokerHealthCheckAttempted: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      packageName: "bullmq",
      productionReady: false,
      queueClientConstructed: false,
      queueEventsConstructed: false,
      sdkClientConstructed: false,
      status: "scaffolded",
      valid: true,
      workerConstructed: false,
    });
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingLiveBrokerConnectionAttempted).toBe(false);
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted).toBe(false);
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingLiveQueuePublishingEnabled).toBe(false);
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingLiveWorkerExecutionEnabled).toBe(false);
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingQueueClientConstructed).toBe(false);
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingQueueEventsConstructed).toBe(false);
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingWorkerConstructed).toBe(false);
    expect(scheduler.readiness.liveCronExecutionEnabled).toBe(false);
    expect(scheduler.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(scheduler.readiness.liveSchedulerExecutionEnabled).toBe(false);
    expect(triggerResult).toMatchObject({
      liveCronExecutionEnabled: false,
      liveExecutionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
  });

  it("keeps constructed BullMQ clients separate from scheduler and queue execution", () => {
    const packageBinding = createQueueProviderPackageBinding({
      constructionFactory: constructedBullmqFactory,
      env: bullmqConstructionReadyEnv,
      profileId: "production-required",
    });
    const scheduler = createSchedulerRuntimeFoundation({
      env: bullmqConstructionReadyEnv,
      profileId: "production-required",
    });
    const queue = queueRuntime.createQueueRuntimeFoundation({
      env: bullmqConstructionReadyEnv,
      profileId: "production-required",
    });
    const triggerResult = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-constructed-bullmq-scheduler-separation",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });

    expect(packageBinding).toMatchObject({
      bullmqConstructionStatus: "constructed",
      liveBrokerConnectionAttempted: false,
      liveBrokerHealthCheckAttempted: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
      queueClientConstructed: true,
      queueEventsConstructed: true,
      sdkClientConstructed: false,
      workerConstructed: true,
    });
    expect(scheduler.readiness).toMatchObject({
      liveCronExecutionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
    expect(queue.readiness).toMatchObject({
      liveQueuePublishingEnabled: false,
      providerAdapterDriverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
      providerAdapterDriverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false,
      providerAdapterDriverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
      providerAdapterDriverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
    });
    expect(triggerResult).toMatchObject({
      liveCronExecutionEnabled: false,
      liveExecutionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
  });

  it("keeps scheduler readiness from satisfying worker lease store readiness", () => {
    const schedulerEnv = {
      CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:scheduler",
      CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
      CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:scheduler",
      CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:scheduler",
      CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY: "operator-policy:review",
      CAMPAIGN_OS_SCHEDULER_ENDPOINT: "scheduler-endpoint-ref:review",
      CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL: "scheduler-lease-ref:review",
      CAMPAIGN_OS_SCHEDULER_PROVIDER: "metadata-only-scheduler",
      CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
    };
    const scheduler = createSchedulerRuntimeFoundation({
      env: schedulerEnv,
      profileId: "production-required",
    });
    const queue = queueRuntime.createQueueRuntimeFoundation({ profileId: "local-review" });
    const leaseStore = createWorkerLeaseStoreFoundation({
      env: schedulerEnv,
      profileId: "production-required",
    });
    const triggerResult = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-scheduler-lease-separation",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });

    expect(scheduler.status).toBe("local_ready");
    expect(scheduler.valid).toBe(true);
    expect(scheduler.productionReady).toBe(false);
    expect(scheduler.readiness.dryRunTriggerEnabled).toBe(true);
    expect(scheduler.readiness.requiredConfigKeys).toContain("CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL");
    expect(scheduler.readiness.requiredConfigKeys).not.toContain("CAMPAIGN_OS_WORKER_LEASE_STORE");
    expect(leaseStore.status).toBe("blocked");
    expect(leaseStore.valid).toBe(false);
    expect(leaseStore.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "WORKER_LEASE_STORE_MISSING",
        "WORKER_LEASE_STORE_UNSUPPORTED",
        "WORKER_LEASE_ENDPOINT_MISSING",
        "WORKER_LEASE_CREDENTIALS_MISSING",
        "WORKER_LEASE_CLOCK_MISSING",
        "WORKER_LEASE_HEARTBEAT_POLICY_MISSING",
        "WORKER_LEASE_TTL_POLICY_MISSING",
        "WORKER_LEASE_RELEASE_POLICY_MISSING",
        "WORKER_LEASE_STALE_RECOVERY_MISSING",
        "WORKER_LEASE_FENCING_POLICY_MISSING",
      ]),
    );
    expect(queue.leaseStore.status).toBe("local_ready");
    expect(queue.leaseStore.productionReady).toBe(false);
    expect(triggerResult.accepted).toBe(true);
    expect(triggerResult.liveExecutionAttempted).toBe(false);
    expect(triggerResult.liveQueuePublishingEnabled).toBe(false);
    expect(triggerResult.liveSchedulerExecutionEnabled).toBe(false);
    expect(leaseStore.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(leaseStore.readiness.liveWorkerExecutionEnabled).toBe(false);
    expect(leaseStore.noLiveFlags).toEqual(workerLeaseStoreNoLiveFlags);
  });

  it("keeps provider adapter readiness from satisfying queue execution readiness", () => {
    const localQueue = queueRuntime.createQueueRuntimeFoundation();
    const configuredProviderQueue = queueRuntime.createQueueRuntimeFoundation({
      env: {
        ...redisBrokerConnectionReadyEnv,
        CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:review",
        CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
        CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
        CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
        CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-provider",
        CAMPAIGN_OS_QUEUE_PROVIDER: "production-queue-provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_BINDING: "production-provider-sdk-binding",
        CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "production-provider-driver",
        CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "queue-endpoint-ref:provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
        CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
        CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
        CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING: "production-provider-sdk-binding",
        CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE: "package-ref:@provider/queue-sdk",
        CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
        CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:review",
        CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
        CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
      },
      profileId: "production-required",
    });

    expect(localQueue.valid).toBe(true);
    expect(localQueue.productionReady).toBe(false);
    expect(localQueue.providerAdapter.valid).toBe(true);
    expect(localQueue.providerAdapter.productionReady).toBe(false);
    expect(configuredProviderQueue.providerAdapter.valid).toBe(true);
    expect(configuredProviderQueue.providerAdapter.productionReady).toBe(false);
    expect(configuredProviderQueue.productionReady).toBe(false);
    expect(configuredProviderQueue.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(configuredProviderQueue.readiness.providerAdapterDriverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted).toBe(false);
    expect(configuredProviderQueue.readiness.providerAdapterDriverSdkBindingPackageBindingQueueClientConstructed).toBe(false);
    expect(configuredProviderQueue.readiness.providerAdapterDriverSdkBindingPackageBindingQueueEventsConstructed).toBe(false);
    expect(configuredProviderQueue.readiness.providerAdapterDriverSdkBindingPackageBindingWorkerConstructed).toBe(false);
    expect(configuredProviderQueue.providerAdapter.operationCapabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ liveEnabled: false, operation: "publish" }),
        expect.objectContaining({ liveEnabled: false, operation: "ack" }),
        expect.objectContaining({ liveEnabled: false, operation: "nack" }),
        expect.objectContaining({ liveEnabled: false, operation: "dead_letter" }),
      ]),
    );
  });

  it("keeps ready live publishing metadata from enabling worker, consume, ack, retry, or scheduler execution", () => {
    const publishingReadiness = createLiveQueuePublishingReadiness({
      constructionFactory: constructedBullmqFactory,
      env: bullmqConstructionReadyEnv,
      profileId: "production-required",
      publisher: liveQueuePublisher,
    });
    const scheduler = createSchedulerRuntimeFoundation({
      env: bullmqConstructionReadyEnv,
      profileId: "production-required",
    });
    const queue = queueRuntime.createQueueRuntimeFoundation({
      env: bullmqConstructionReadyEnv,
      profileId: "production-required",
    });
    const triggerResult = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-ready-publishing-scheduler-separation",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });
    const enqueueResult = queueRuntime.dryRunQueueEnqueue({
      attempt: 1,
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      payloadReference: "payload-ref:sha256:task-verification-safe",
      queueId: "verification-jobs",
      requestedAt: "2026-07-07T13:30:00Z",
      traceId: "trace-ready-publishing-queue-separation",
    });

    expect(publishingReadiness).toMatchObject({
      liveQueuePublishingEnabled: true,
      publishAttemptAllowed: true,
      status: "ready",
      valid: true,
    });
    expect(scheduler.readiness).toMatchObject({
      liveCronExecutionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
    expect(scheduler.noLiveFlags.liveWorkerExecutionEnabled).toBe(false);
    expect(scheduler.registrations.every((registration) =>
      registration.liveCronExecutionEnabled === false
      && registration.liveQueuePublishingEnabled === false
      && registration.liveSchedulerExecutionEnabled === false
      && registration.queueHandoff.liveQueuePublishingEnabled === false
    )).toBe(true);
    expect(queue.providerAdapter.operationCapabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ liveEnabled: false, operation: "ack" }),
        expect.objectContaining({ liveEnabled: false, operation: "dead_letter" }),
        expect.objectContaining({ liveEnabled: false, operation: "nack" }),
        expect.objectContaining({ liveEnabled: false, operation: "retry" }),
      ]),
    );
    expect(queue.readiness).toMatchObject({
      liveQueuePublishingEnabled: false,
    });
    expect(queue.noLiveFlags).toMatchObject({
      liveSchedulerExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
    });
    expect(triggerResult).toMatchObject({
      liveCronExecutionEnabled: false,
      liveExecutionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
    expect(enqueueResult).toMatchObject({
      livePublishAttempted: false,
      liveQueuePublishingEnabled: false,
    });
    expect(enqueueResult.providerDriverOperation).toMatchObject({
      livePublishAttempted: false,
      productionWriteAttempted: false,
      status: "accepted_local_fake",
    });
  });

  it("keeps ready consume metadata from enabling scheduler execution or publish fallback paths", () => {
    const consumeReadiness = createLiveQueueConsumeLoopReadiness({
      constructionFactory: constructedBullmqFactory,
      consumer: liveQueueConsumer,
      env: consumeReadyEnv,
      handlers: liveQueueHandlers,
      liveQueuePublisher,
      profileId: "production-required",
    });
    const consumeResult = evaluateLiveQueueConsumeMessage(
      {
        attempt: 1,
        idempotencyReference: "idempotency-ref:task-verification-worker",
        jobId: "task-verification-worker",
        leaseReference: "lease-ref:task-verification-worker",
        payloadReference: "payload-ref:task-verification-worker",
        queueId: "verification-jobs",
        traceId: "trace-ready-consume-scheduler-separation",
      },
      { readiness: consumeReadiness },
    );
    const scheduler = createSchedulerRuntimeFoundation();
    const queue = queueRuntime.createQueueRuntimeFoundation({
      env: consumeReadyEnv,
      profileId: "production-required",
    });
    const triggerResult = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-ready-consume-trigger-separation",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });

    expect(consumeReadiness).toMatchObject({
      consumeAttemptAllowed: true,
      liveConsumeAttempted: false,
      liveQueueConsumptionEnabled: true,
      productionReady: false,
      status: "ready",
      valid: true,
    });
    expect(consumeReadiness.noLiveSideEffects).toMatchObject({
      analyticsWrites: false,
      contractCalls: false,
      objectStorageWrites: false,
      providerCalls: false,
      publishFallback: false,
      rewardDistribution: false,
      schedulerExecution: false,
      telemetryExport: false,
      workerExecution: false,
    });
    expect(consumeResult).toMatchObject({
      ackAttempted: true,
      liveConsumeAttempted: true,
      published: false,
      status: "accepted",
    });
    expect(consumeResult.noLiveSideEffects).toMatchObject({
      publishFallback: false,
      schedulerExecution: false,
      telemetryExport: false,
      workerExecution: false,
    });
    expect(scheduler.readiness).toMatchObject({
      liveCronExecutionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
    expect(scheduler.noLiveFlags.liveWorkerExecutionEnabled).toBe(false);
    expect(triggerResult).toMatchObject({
      liveCronExecutionEnabled: false,
      liveExecutionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
    expect(queue.readiness).toMatchObject({
      liveQueuePublishingEnabled: false,
      providerAdapterDriverConsumingLiveConsumeAttempted: false,
      providerAdapterDriverConsumingLiveQueueConsumptionEnabled: false,
      providerAdapterDriverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
      providerAdapterDriverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
      providerAdapterDriverSdkBindingPackageBindingWorkerConstructed: false,
    });
    expect(queue.providerAdapter.operationCapabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ liveEnabled: false, operation: "ack" }),
        expect.objectContaining({ liveEnabled: false, operation: "dead_letter" }),
        expect.objectContaining({ liveEnabled: false, operation: "publish" }),
        expect.objectContaining({ liveEnabled: false, operation: "retry" }),
      ]),
    );
  });

  it("keeps provider client readiness as metadata without enabling scheduler, workers, or consume side effects", () => {
    const providerClientReadiness = createProviderIndexerClientReadiness();
    const providerResult = evaluateProviderVerificationRequest(
      {
        attempt: { count: 1, maxAttempts: 3 },
        campaignId: "campaign-1",
        evidenceHash: "sha256:provider-evidence",
        evidenceRef: "evidence-ref:provider-evidence",
        idempotencyRef: "idempotency-ref:provider-readiness",
        leaseRef: "lease-ref:provider-readiness",
        providerGroupId: "aefinder-aelfscan-indexers",
        queueId: "verification-jobs",
        taskId: "task-1",
        traceId: "trace-provider-client-separation",
        verificationType: "ON_CHAIN",
        walletAccountRef: "wallet-account-ref:participant",
        walletSessionRef: "wallet-session-ref:participant",
        workerJobId: "task-verification-worker",
      },
      { readiness: providerClientReadiness },
    );
    const scheduler = createSchedulerRuntimeFoundation();
    const workerScheduler = createWorkerSchedulerFoundation();
    const queue = queueRuntime.createQueueRuntimeFoundation();
    const consumeReadiness = createLiveQueueConsumeLoopReadiness();
    const triggerResult = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-provider-client-scheduler-separation",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });

    expect(providerClientReadiness).toMatchObject({
      activationStatus: "disabled",
      liveProviderCallsAttempted: false,
      productionReady: false,
      providerClientsEnabled: false,
      providerClientsProvided: false,
      status: "disabled",
      valid: true,
    });
    expect(providerClientReadiness.downstreamLiveFlags).toEqual({
      alternateQueuePublish: false,
      analyticsIngestion: false,
      contractCalls: false,
      objectStorageWrites: false,
      rewardDistribution: false,
      schedulerExecution: false,
      telemetryVendorExport: false,
    });
    expect(providerResult).toMatchObject({
      clientExecuted: false,
      diagnosticCodes: expect.arrayContaining(["PROVIDER_CLIENT_NOT_READY"]),
      liveProviderCallsAttempted: false,
      outcome: "blocked",
      retryPosture: "blocked",
    });
    expect(providerResult.downstreamLiveFlags).toEqual(providerClientReadiness.downstreamLiveFlags);
    expect(scheduler.readiness).toMatchObject({
      liveCronExecutionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
    expect(workerScheduler.readiness).toMatchObject({
      consumeAckAttempted: false,
      consumeDeadLetterAttempted: false,
      consumeNackAttempted: false,
      consumeRetryScheduled: false,
      liveSchedulerExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
      providerClientReadinessDependency: providerClientReadiness.id,
      providerClientReadinessRequired: true,
    });
    expect(workerScheduler.providerJobHandoffs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          liveSchedulerExecutionEnabled: false,
          liveWorkerExecutionEnabled: false,
          providerClientReadinessDependency: providerClientReadiness.id,
          providerClientReadinessRequired: true,
        }),
      ]),
    );
    expect(queue.readiness).toMatchObject({
      liveQueuePublishingEnabled: false,
      providerAdapterDriverConsumingLiveConsumeAttempted: false,
      providerAdapterDriverConsumingLiveQueueConsumptionEnabled: false,
      providerAdapterDriverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
    });
    expect(consumeReadiness).toMatchObject({
      consumeAttemptAllowed: false,
      liveConsumeAttempted: false,
      liveQueueConsumptionEnabled: false,
      productionReady: false,
    });
    expect(consumeReadiness.noLiveSideEffects).toMatchObject({
      publishFallback: false,
      schedulerExecution: false,
      telemetryExport: false,
      workerExecution: false,
    });
    expect(triggerResult).toMatchObject({
      liveCronExecutionEnabled: false,
      liveExecutionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
  });

  it("keeps provider HTTP runtime activation from starting scheduler drain, cron, worker, queue, idempotency, or lease paths", () => {
    const providerHttpRuntime = createProviderHttpRuntimeSummary({
      env: providerHttpReadyEnv,
      profileId: "production-required",
      transportProvided: true,
    });
    const scheduler = createSchedulerRuntimeFoundation({
      env: providerHttpReadyEnv,
      profileId: "production-required",
    });
    const workerScheduler = createWorkerSchedulerFoundation({
      env: providerHttpReadyEnv,
      profileId: "production-required",
    });
    const queue = queueRuntime.createQueueRuntimeFoundation({
      env: providerHttpReadyEnv,
      profileId: "production-required",
    });
    const triggerResult = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-provider-http-runtime-scheduler-separation",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });
    const enqueueResult = queueRuntime.dryRunQueueEnqueue({
      attempt: 1,
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      payloadReference: "payload-ref:sha256:task-verification-safe",
      queueId: "verification-jobs",
      requestedAt: "2026-07-07T13:30:00Z",
      traceId: "trace-provider-http-runtime-queue-separation",
    });

    expect(providerHttpRuntime).toMatchObject({
      activationStatus: "explicitly_enabled",
      liveHttpCallsAttempted: false,
      productionReady: false,
      status: "activated",
      transportProvided: true,
      valid: true,
    });
    expect(providerHttpRuntime.downstreamLiveFlags).toEqual({
      alternateQueuePublishing: false,
      analyticsIngestion: false,
      contractCalls: false,
      liveTelemetryExport: false,
      objectStorageWrites: false,
      renderedUiBehavior: false,
      rewardDistribution: false,
      schedulerExecution: false,
    });
    expect(scheduler.readiness).toMatchObject({
      liveCronExecutionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
    expect(workerScheduler.providerHttpRuntime).toMatchObject({
      activationStatus: "explicitly_enabled",
      idempotencyPosture: "policy-and-store-reference-only",
      leasePosture: "store-reference-only",
      liveHttpCallsAttempted: false,
      liveSchedulerExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
      queueId: "verification-jobs",
      status: "activated",
      transportProvided: true,
      workerJobId: "task-verification-worker",
    });
    expect(workerScheduler.readiness).toMatchObject({
      consumeAckAttempted: false,
      consumeDeadLetterAttempted: false,
      consumeNackAttempted: false,
      consumeRetryScheduled: false,
      idempotencyStoreLiveIdempotencyExecutionEnabled: false,
      leaseStoreLiveQueuePublishingEnabled: false,
      leaseStoreLiveWorkerExecutionEnabled: false,
      liveSchedulerExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
    });
    expect(queue.readiness).toMatchObject({
      idempotencyStoreLiveIdempotencyExecutionEnabled: false,
      leaseStoreLiveQueuePublishingEnabled: false,
      leaseStoreLiveWorkerExecutionEnabled: false,
      liveQueueConsumptionEnabled: false,
      liveQueuePublishingEnabled: false,
      providerAdapterDriverConsumingLiveConsumeAttempted: false,
      providerAdapterDriverConsumingLiveQueueConsumptionEnabled: false,
      providerAdapterDriverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
      providerAdapterDriverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
    });
    expect(queue.idempotencyStore).toMatchObject({
      liveIdempotencyExecutionEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
    });
    expect(queue.leaseStore).toMatchObject({
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
    });
    expect(triggerResult).toMatchObject({
      liveCronExecutionEnabled: false,
      liveExecutionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
    });
    expect(enqueueResult).toMatchObject({
      livePublishAttempted: false,
      liveQueuePublishingEnabled: false,
    });
  });

  it("keeps queue provider and scheduler readiness from satisfying idempotency readiness", () => {
    const sharedEnv = {
      ...redisBrokerConnectionReadyEnv,
      CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:review",
      CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
      CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
      CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
      CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
      CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY: "operator-policy:review",
      CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-provider",
      CAMPAIGN_OS_QUEUE_PROVIDER: "production-queue-provider",
      CAMPAIGN_OS_QUEUE_PROVIDER_BINDING: "production-provider-sdk-binding",
      CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-provider",
      CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "production-provider-driver",
      CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "queue-endpoint-ref:provider",
      CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
      CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
      CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
      CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING: "production-provider-sdk-binding",
      CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE: "package-ref:@provider/queue-sdk",
      CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
      CAMPAIGN_OS_SCHEDULER_ENDPOINT: "scheduler-endpoint-ref:review",
      CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL: "scheduler-lease-ref:review",
      CAMPAIGN_OS_SCHEDULER_PROVIDER: "metadata-only-scheduler",
      CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:review",
      CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
      CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
    };
    const queue = queueRuntime.createQueueRuntimeFoundation({
      env: sharedEnv,
      profileId: "production-required",
    });
    const scheduler = createSchedulerRuntimeFoundation({
      env: sharedEnv,
      profileId: "production-required",
    });
    const idempotencyStore = createWorkerIdempotencyStoreFoundation({
      env: sharedEnv,
      profileId: "production-required",
    });

    expect(queue.providerAdapter.valid).toBe(true);
    expect(scheduler.valid).toBe(true);
    expect(queue.providerAdapter.requiredConfigKeys).toContain("CAMPAIGN_OS_IDEMPOTENCY_STORE_URL");
    expect(scheduler.readiness.requiredConfigKeys).toContain("CAMPAIGN_OS_IDEMPOTENCY_STORE_URL");
    expect(idempotencyStore.valid).toBe(false);
    expect(idempotencyStore.status).toBe("blocked");
    expect(idempotencyStore.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "IDEMPOTENCY_STORE_MISSING",
        "IDEMPOTENCY_STORE_CREDENTIALS_MISSING",
        "IDEMPOTENCY_NAMESPACE_MISSING",
        "IDEMPOTENCY_KEY_SCHEMA_VERSION_MISSING",
        "IDEMPOTENCY_RETENTION_POLICY_MISSING",
        "IDEMPOTENCY_CONFLICT_POLICY_MISSING",
        "IDEMPOTENCY_COMPLETION_POLICY_MISSING",
      ]),
    );
    expect(idempotencyStore.readiness.requiredConfigKeys).not.toEqual(
      queue.providerAdapter.requiredConfigKeys,
    );
    expect(idempotencyStore.readiness.requiredConfigKeys).not.toEqual(scheduler.readiness.requiredConfigKeys);
    expect(idempotencyStore.readiness.liveIdempotencyExecutionEnabled).toBe(false);
    expect(queue.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted).toBe(false);
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingQueueClientConstructed).toBe(false);
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingQueueEventsConstructed).toBe(false);
    expect(queue.readiness.providerAdapterDriverSdkBindingPackageBindingWorkerConstructed).toBe(false);
    expect(scheduler.readiness.liveSchedulerExecutionEnabled).toBe(false);
  });

  it("keeps idempotency dry-run metadata from satisfying verification or domain side effects", () => {
    const beforeSnapshot = {
      campaignStatus: campaignDetail.status,
      completedTaskIds: campaignDetail.participants.map((participant) => [...participant.completedTaskIds]),
      exportRows: campaignDetail.exportPreview.rows.length,
      reviewItemStates: campaignDetail.reviewItems.map((item) => item.status),
    };
    const idempotency = createWorkerIdempotencyStoreFoundation();
    const idempotencyResult = evaluateWorkerIdempotencyDryRun({
      attempt: 1,
      completionEvidenceReference: "evidence:task-verification:local",
      idempotencyKeyReference: "idempotency:task-verification-worker:campaign-1",
      jobId: "task-verification-worker",
      leaseKeyReference: "lease:task-verification-worker:campaign-1",
      operation: "complete",
      requestedAt: "2026-07-07T13:30:00Z",
      sideEffectBoundary: "points-ledger-and-task-completion",
      traceId: "trace-idempotency-separation",
      workerReference: "worker:task-verification",
    });
    const auth = createAuthSessionReadinessReport();
    const provider = createProviderIndexerFoundation();
    const verification = createVerificationSourceHandoff();
    const lifecycle = createCampaignLifecycleOperations(campaignDetail);
    const analytics = createAdvancedAnalyticsReadiness(campaignDetail);
    const exportFulfillment = createExportFulfillmentReadiness(campaignDetail);
    const contractTransparency = createContractTransparencyMonitor(campaignDetail);
    const afterSnapshot = {
      campaignStatus: campaignDetail.status,
      completedTaskIds: campaignDetail.participants.map((participant) => [...participant.completedTaskIds]),
      exportRows: campaignDetail.exportPreview.rows.length,
      reviewItemStates: campaignDetail.reviewItems.map((item) => item.status),
    };

    expect(idempotency).toMatchObject({
      productionReady: false,
      status: "local_ready",
      valid: true,
    });
    expect(idempotency.noLiveFlags).toEqual(workerIdempotencyStoreNoLiveFlags);
    expect(idempotencyResult).toMatchObject({
      accepted: true,
      liveIdempotencyOperationAttempted: false,
      liveWorkerExecutionEnabled: false,
      operation: "complete",
      productionWriteAttempted: false,
      status: "accepted_dry_run",
    });
    expect(beforeSnapshot).toEqual(afterSnapshot);
    expect(auth.proofBoundary.liveVerificationExecuted).toBe(false);
    expect(auth.authContracts.proofVerifier.productionReady).toBe(false);
    expect(provider.productionReady).toBe(false);
    expect(provider.noLiveFlags.liveProviderCallsEnabled).toBe(false);
    expect(verification.liveExecutionEnabled).toBe(false);
    expect(verification.entries.every((entry) => entry.queuePosture.liveWorkerExecutionEnabled === false)).toBe(true);
    expect(analytics.boundary["en-US"]).toContain("No live analytics SDK");
    expect(exportFulfillment.safety).toMatchObject({
      noContractTransaction: true,
      noRewardCustody: true,
      noRewardDistribution: true,
      noStorageWrite: true,
    });
    expect(contractTransparency.boundary["en-US"]).toContain("No live contract transaction");
    expect(lifecycle.operations.map((operation) => operation.operationState)).toEqual(
      expect.arrayContaining(["not_applicable", "review_required"]),
    );
    expect(lifecycle.operations.every((operation) => operation.localOnly)).toBe(true);
    const serializedIdempotencyBoundary = JSON.stringify({
      analytics,
      contractTransparency,
      exportFulfillment,
      idempotencyResult,
      lifecycle,
      provider,
      verification,
    });

    for (const forbiddenField of [
      "verificationCompleted",
      "walletAuthenticated",
      "providerReady",
      "queuePublished",
      "contractSynced",
      "analyticsWritten",
      "exportPrepared",
      "rewardReleased",
    ]) {
      expect(serializedIdempotencyBoundary).not.toContain(forbiddenField);
    }
  });

  it("does not satisfy wallet auth, provider readiness, verification completion, or manual review", () => {
    const serialized = serializedSchedulerOutput();
    const queue = queueRuntime.createQueueRuntimeFoundation({
      profileId: "staging-scaffold",
      providerId: "metadata-only",
    });
    const auth = createAuthSessionReadinessReport();
    const provider = createProviderIndexerFoundation();
    const verification = createVerificationSourceHandoff();

    expect(auth.proofBoundary.liveVerificationExecuted).toBe(false);
    expect(auth.agentCredentialBoundary.agentSkillCanSubstituteUserWallet).toBe(false);
    expect(provider.productionReady).toBe(false);
    expect(provider.noLiveFlags.liveProviderCallsEnabled).toBe(false);
    expect(queue.providerAdapter.status).toBe("scaffolded");
    expect(queue.providerAdapter.liveQueuePublishingEnabled).toBe(false);
    expect(queue.providerAdapter.productionReady).toBe(false);
    expect(verification.liveExecutionEnabled).toBe(false);
    expect(verification.entries.find((entry) => entry.verificationType === "WALLET")).toMatchObject({
      authSessionRequired: true,
      providerReadinessSatisfiesAuthentication: false,
      workerRequired: false,
    });
    expect(verification.entries.find((entry) => entry.verificationType === "MANUAL")).toMatchObject({
      unavailableDegradationOutcome: "manual_review",
      workerRequired: false,
    });

    for (const forbiddenField of [
      "verificationCompleted",
      "walletAuthenticated",
      "providerReady",
      "providerAdapterReady",
      "queuePublished",
      "manualReviewApproved",
      "pointsAwarded",
      "contractSynced",
      "rewardReleased",
    ]) {
      expect(serialized).not.toContain(forbiddenField);
    }
  });

  it("keeps high-risk schedules blocked, manual review, or metadata-only with no live side effects", () => {
    const byScheduleId = new Map(schedulerRuntimeRegistrations.map((item) => [item.scheduleId, item]));

    expect(byScheduleId.get("campaign-lifecycle-time-boundary")).toMatchObject({
      jobFamily: "campaign_lifecycle",
      operatorOverride: { manualReviewRequired: true },
      queueHandoff: { degradedOutcome: "blocked" },
      sideEffectBoundary: "no-live-campaign-status-transition",
    });
    expect(byScheduleId.get("export-preparation-operator")).toMatchObject({
      jobFamily: "export_preparation",
      operatorOverride: { manualReviewRequired: true },
      queueHandoff: { degradedOutcome: "manual_review" },
      sideEffectBoundary: "no-live-export-artifact-write",
    });
    expect(byScheduleId.get("contract-sync-operator")).toMatchObject({
      jobFamily: "contract_sync_handoff",
      operatorOverride: { manualReviewRequired: true },
      queueHandoff: { degradedOutcome: "blocked" },
      sideEffectBoundary: "no-live-contract-read-or-write",
    });
    expect(byScheduleId.get("reward-distribution-operator")).toMatchObject({
      jobFamily: "reward_distribution_handoff",
      operatorOverride: { manualReviewRequired: true },
      queueHandoff: { degradedOutcome: "manual_review" },
      sideEffectBoundary: "no-live-reward-custody-or-distribution",
    });
    expect(byScheduleId.get("analytics-ingestion-recurring")).toMatchObject({
      jobFamily: "analytics_ingestion_handoff",
      queueHandoff: { degradedOutcome: "metadata_only" },
      sideEffectBoundary: "no-live-analytics-ingestion",
    });
    expect(byScheduleId.get("ai-ops-report-recurring")).toMatchObject({
      jobFamily: "ai_ops_report",
      queueHandoff: { degradedOutcome: "metadata_only" },
      sideEffectBoundary: "no-live-ai-provider-call",
    });

    for (const scheduleId of [
      "campaign-lifecycle-time-boundary",
      "export-preparation-operator",
      "contract-sync-operator",
      "reward-distribution-operator",
      "analytics-ingestion-recurring",
      "ai-ops-report-recurring",
    ]) {
      const registration = byScheduleId.get(scheduleId);

      expect(registration?.liveCronExecutionEnabled).toBe(false);
      expect(registration?.liveQueuePublishingEnabled).toBe(false);
      expect(registration?.liveSchedulerExecutionEnabled).toBe(false);
    }
  });

  it("keeps lease dry-run metadata from mutating domain side-effect state", () => {
    const beforeSnapshot = {
      campaignStatus: campaignDetail.status,
      completedTaskIds: campaignDetail.participants.map((participant) => [...participant.completedTaskIds]),
      exportRows: campaignDetail.exportPreview.rows.length,
      publishBlockers: [...campaignDetail.publishReadiness.blockers],
      reviewItemStates: campaignDetail.reviewItems.map((item) => item.status),
    };
    const leaseResult = evaluateWorkerLeaseDryRun({
      heartbeatIntervalSeconds: 30,
      jobId: "campaign-lifecycle-worker",
      leaseKeyReference: "lease:campaign:lifecycle",
      operation: "claim",
      requestedAt: "2026-07-07T13:30:00Z",
      traceId: "trace-domain-lease-separation",
      ttlSeconds: 120,
      workerReference: "worker:campaign:lifecycle",
    });
    const lifecycle = createCampaignLifecycleOperations(campaignDetail);
    const analytics = createAdvancedAnalyticsReadiness(campaignDetail);
    const exportFulfillment = createExportFulfillmentReadiness(campaignDetail);
    const contractTransparency = createContractTransparencyMonitor(campaignDetail);
    const verification = createVerificationSourceHandoff();
    const afterSnapshot = {
      campaignStatus: campaignDetail.status,
      completedTaskIds: campaignDetail.participants.map((participant) => [...participant.completedTaskIds]),
      exportRows: campaignDetail.exportPreview.rows.length,
      publishBlockers: [...campaignDetail.publishReadiness.blockers],
      reviewItemStates: campaignDetail.reviewItems.map((item) => item.status),
    };

    expect(leaseResult).toMatchObject({
      accepted: true,
      liveLeaseOperationAttempted: false,
      liveWorkerExecutionEnabled: false,
      operation: "claim",
      status: "accepted_dry_run",
    });
    expect(beforeSnapshot).toEqual(afterSnapshot);
    expect(verification.entries.every((entry) => entry.liveExecutionEnabled === false)).toBe(true);
    expect(verification.entries.map((entry) => entry.queuePosture.liveWorkerExecutionEnabled)).toEqual(
      verification.entries.map(() => false),
    );
    expect(lifecycle.currentStatus).toBe(beforeSnapshot.campaignStatus);
    expect(lifecycle.operations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          affectedOutcome: "launch",
          id: "publish-campaign",
          operationState: expect.not.stringMatching(/^executed$/),
        }),
        expect.objectContaining({
          affectedOutcome: "export",
          id: "export-campaign",
          operationState: expect.not.stringMatching(/^executed$/),
        }),
      ]),
    );
    expect(analytics.boundary["en-US"]).toContain("No live analytics SDK");
    expect(exportFulfillment.safety).toMatchObject({
      localOnly: true,
      noContractTransaction: true,
      noDownloadUrl: true,
      noRewardCustody: true,
      noRewardDistribution: true,
      noStorageWrite: true,
    });
    expect(contractTransparency.summary.blockedLanes + contractTransparency.summary.reviewRequiredLanes).toBeGreaterThan(0);
    expect(contractTransparency.lanes.every((lane) => lane.blocksExecution || lane.readiness !== "ready")).toBe(false);
    expect(contractTransparency.boundary["en-US"]).toContain("No live contract transaction");
    expect(contractTransparency.boundary["en-US"]).toContain("reward custody");
    expect(JSON.stringify({ analytics, contractTransparency, exportFulfillment, lifecycle })).not.toContain(
      "liveLeaseOperationAttempted\":true",
    );
  });

  it("redacts unsafe scheduler serialization without leaking raw queue, wallet, or provider material", () => {
    const foundation = createSchedulerRuntimeFoundation({
      profileId: "https://scheduler-user:scheduler-pass@scheduler.invalid/hook?token=scheduler-secret",
    });
    const rejected = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:ELF_raw_wallet",
      jobId: "task-verification-worker",
      operatorOverrideReason: "Bearer scheduler-token-123",
      queueHandoffReference: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-redaction",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });
    const redactedUnsafeFixture = redactSchedulerRuntimeValue({
      objectKey: "tenant/raw/export.csv",
      providerPayload: "{\"address\":\"ELF_provider_payload\",\"score\":99}",
      signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
      triggerPayload: "{\"walletAddress\":\"ELF_raw_wallet\",\"taskId\":\"task_raw\"}",
      webhookSecret: "hook-secret-000",
    });
    const serialized = JSON.stringify({
      foundation,
      redactedUnsafeFixture,
      registrations: schedulerRuntimeRegistrations,
      rejected,
    });

    expect(serialized).not.toContain("scheduler-user");
    expect(serialized).not.toContain("scheduler-pass");
    expect(serialized).not.toContain("scheduler-secret");
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret");
    expect(serialized).not.toContain("scheduler-token-123");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).not.toContain("tenant/raw/export.csv");
    expect(serialized).not.toContain("ELF_provider_payload");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("task_raw");
    expect(serialized).not.toContain("hook-secret-000");
    expect(serialized).toContain("[redacted]");
  });
});
