import { describe, expect, it } from "vitest";
import type { BullmqConstructionFactory } from "./bullmqConstructionReadiness";
import {
  createLiveQueueConsumeLoopReadiness,
  evaluateLiveQueueConsumeMessage,
  liveQueueConsumeNoLiveSideEffects,
  liveQueueConsumeProductionPreconditions,
  redactLiveQueueConsumeValue,
  type LiveQueueConsumer,
  type LiveQueueHandler,
  type LiveQueueConsumeDiagnosticCode,
} from "./liveQueueConsumeLoop";
import type { LiveQueuePublisher } from "./liveQueuePublishingReadiness";

const productionReadyConsumeEnv = {
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY: "factory-ref:bullmq-construction",
  CAMPAIGN_OS_CONSUME_HANDLER_REGISTRY: "handler-registry-ref:workers",
  CAMPAIGN_OS_DEAD_LETTER_QUEUE: "queue-ref:dead-letter",
  CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-ref:store",
  CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:consume",
  CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:consume",
  CAMPAIGN_OS_PAYLOAD_REFERENCE_POLICY: "payload-reference-only",
  CAMPAIGN_OS_PUBLISHER_REDACTION_POLICY: "redact-unsafe-values",
  CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "circuit-breaker:fail-closed",
  CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "2500",
  CAMPAIGN_OS_REDIS_CREDENTIALS: "credential-ref:redis-broker",
  CAMPAIGN_OS_REDIS_DATABASE: "database-ref:0",
  CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "retry-backoff:exponential",
  CAMPAIGN_OS_REDIS_TLS_POLICY: "tls-policy:required",
  CAMPAIGN_OS_REDIS_URL: "redis-endpoint-ref:campaign-os",
  CAMPAIGN_OS_RETRY_POLICY: "worker-retry-policy-ref",
  CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-ref:store",
  CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
} satisfies Record<string, unknown>;

const missingProductionDiagnosticCodes: LiveQueueConsumeDiagnosticCode[] = [
  "LIVE_QUEUE_CONSUME_ACTIVATION_MISSING",
  "LIVE_QUEUE_CONSUMER_MISSING",
  "LIVE_QUEUE_HANDLER_REGISTRY_MISSING",
  "LIVE_QUEUE_PUBLISHING_HANDOFF_MISSING",
  "LIVE_QUEUE_ROUTE_MISSING",
  "LIVE_QUEUE_DEAD_LETTER_ROUTE_MISSING",
  "LIVE_QUEUE_PAYLOAD_POLICY_MISSING",
  "LIVE_QUEUE_IDEMPOTENCY_HANDOFF_MISSING",
  "LIVE_QUEUE_LEASE_HANDOFF_MISSING",
  "LIVE_QUEUE_RETRY_POLICY_MISSING",
  "LIVE_QUEUE_OBSERVABILITY_HANDOFF_MISSING",
  "LIVE_QUEUE_RUNBOOK_MISSING",
  "LIVE_QUEUE_REDACTION_POLICY_MISSING",
  "BULLMQ_CONSTRUCTION_ACTIVATION_MISSING",
  "BULLMQ_CONSTRUCTION_FACTORY_MISSING",
  "BULLMQ_CONSTRUCTION_OBSERVABILITY_HANDOFF_MISSING",
  "BULLMQ_CONSTRUCTION_RUNBOOK_MISSING",
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
  "LIVE_QUEUE_PUBLISHING_ACTIVATION_MISSING",
  "LIVE_QUEUE_PUBLISHER_MISSING",
  "LIVE_QUEUE_ROUTE_MISSING",
  "LIVE_QUEUE_DEAD_LETTER_ROUTE_MISSING",
  "LIVE_QUEUE_PAYLOAD_POLICY_MISSING",
  "LIVE_QUEUE_IDEMPOTENCY_HANDOFF_MISSING",
  "LIVE_QUEUE_LEASE_HANDOFF_MISSING",
  "LIVE_QUEUE_OBSERVABILITY_HANDOFF_MISSING",
  "LIVE_QUEUE_RUNBOOK_MISSING",
  "LIVE_QUEUE_REDACTION_POLICY_MISSING",
  "BULLMQ_CONSTRUCTION_ACTIVATION_MISSING",
  "BULLMQ_CONSTRUCTION_FACTORY_MISSING",
  "BULLMQ_CONSTRUCTION_OBSERVABILITY_HANDOFF_MISSING",
  "BULLMQ_CONSTRUCTION_RUNBOOK_MISSING",
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

const constructionFactory: BullmqConstructionFactory = {
  construct: () => ({
    queueClient: {
      clientId: "live-queue-consume-queue-client",
      constructed: true,
      optionReferenceId: "queue-options-ref",
    },
    queueEvents: {
      clientId: "live-queue-consume-queue-events",
      constructed: true,
      optionReferenceId: "events-options-ref",
    },
    worker: {
      clientId: "live-queue-consume-worker-client",
      constructed: true,
      optionReferenceId: "worker-options-ref",
    },
  }),
  factoryId: "test-bullmq-consume-construction-factory",
};

const publisher: LiveQueuePublisher = {
  publish: () => ({
    providerReference: "provider-ref:accepted",
    status: "accepted",
  }),
  publisherId: "test-live-queue-publisher",
};

const consumer: LiveQueueConsumer = {
  ack: () => ({ operationId: "ack-operation", status: "accepted" }),
  consumerId: "test-live-queue-consumer",
  deadLetter: () => ({ operationId: "dead-letter-operation", status: "accepted" }),
  nack: () => ({ operationId: "nack-operation", status: "accepted" }),
  reserve: () => ({ operationId: "reserve-operation", status: "accepted" }),
  retry: () => ({ operationId: "retry-operation", status: "accepted" }),
};

const completedHandler: LiveQueueHandler = {
  handle: () => ({ status: "completed" }),
  handlerId: "task-verification-handler",
  jobIds: ["task-verification-worker"],
};

const safeMessage = {
  attempt: 1,
  fencingTokenReference: "fence-ref:worker-1",
  idempotencyReference: "idem-ref:campaign-task-1",
  jobId: "task-verification-worker",
  leaseReference: "lease-ref:task-1",
  payloadHash: "sha256:1234",
  payloadReference: "payload-ref:task-1",
  queueId: "verification-jobs",
  requestedAt: "2026-07-08T09:00:00Z",
  traceId: "trace-live-consume-1",
};

function createReadyReadiness(
  handler: LiveQueueHandler = completedHandler,
  injectedConsumer: LiveQueueConsumer = consumer,
) {
  return createLiveQueueConsumeLoopReadiness({
    constructionFactory,
    consumer: injectedConsumer,
    env: productionReadyConsumeEnv,
    handlers: [handler],
    liveQueuePublisher: publisher,
    profileId: "production-required",
  });
}

describe("live queue consume loop boundary", () => {
  it("keeps local review deterministic, server-only, and no-live", () => {
    const startedAt = performance.now();
    const foundation = createLiveQueueConsumeLoopReadiness({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.id).toBe("campaign-os-live-queue-consume-loop-readiness");
    expect(foundation).toMatchObject({
      activationStatus: "disabled",
      blockerCount: 0,
      consumeAttemptAllowed: false,
      consumerId: "not_configured",
      consumerProvided: false,
      handlerRegistryProvided: false,
      liveConsumeAttempted: false,
      liveQueueConsumptionEnabled: false,
      mode: "dry_run",
      productionReady: false,
      profileId: "local-review",
      status: "disabled",
      valid: true,
    });
    expect(foundation.noLiveSideEffects).toEqual(liveQueueConsumeNoLiveSideEffects);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(Object.values(foundation.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("fails closed for production-required when consume preconditions are missing", () => {
    const foundation = createLiveQueueConsumeLoopReadiness({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.consumeAttemptAllowed).toBe(false);
    expect(foundation.liveQueueConsumptionEnabled).toBe(false);
    expect(foundation.blockerCount).toBe(liveQueueConsumeProductionPreconditions.length + 14 + 24);
    expect(foundation.diagnosticCodes).toEqual(missingProductionDiagnosticCodes);
    expect(foundation.bullmqConstruction.workerConstructed).toBe(false);
    expect(foundation.publishingReadiness.liveQueuePublishingEnabled).toBe(false);
  });

  it("acks a safe message only through injected consumer and handler seams", () => {
    const foundation = createReadyReadiness();
    const result = evaluateLiveQueueConsumeMessage(safeMessage, { readiness: foundation });

    expect(foundation).toMatchObject({
      consumeAttemptAllowed: true,
      liveQueueConsumptionEnabled: true,
      productionReady: false,
      status: "ready",
      valid: true,
    });
    expect(result).toMatchObject({
      ackAttempted: true,
      deadLetterAttempted: false,
      decision: "ack",
      handlerExecuted: true,
      jobId: "task-verification-worker",
      liveConsumeAttempted: true,
      nackAttempted: false,
      queueId: "verification-jobs",
      retryScheduled: false,
      status: "accepted",
      traceId: "trace-live-consume-1",
    });
    expect(Object.values(result.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("rejects unsafe messages before consumer or handler execution", () => {
    let consumerCalled = false;
    let handlerCalled = false;
    const guardedConsumer: LiveQueueConsumer = {
      ...consumer,
      reserve: () => {
        consumerCalled = true;
        return { status: "accepted" };
      },
    };
    const guardedHandler: LiveQueueHandler = {
      handle: () => {
        handlerCalled = true;
        return { status: "completed" };
      },
      handlerId: "guarded-handler",
      jobIds: ["task-verification-worker"],
    };
    const foundation = createReadyReadiness(guardedHandler, guardedConsumer);
    const result = evaluateLiveQueueConsumeMessage(
      {
        ...safeMessage,
        idempotencyReference: "wallet/ELF_secret_wallet/task.json",
        leaseReference: "lease-token=secret-worker-token",
        payloadReference: "{\"walletAddress\":\"ELF_SECRET\",\"payload\":true}",
      },
      { readiness: foundation },
    );

    expect(consumerCalled).toBe(false);
    expect(handlerCalled).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.decision).toBe("blocked");
    expect(result.liveConsumeAttempted).toBe(false);
    expect(result.handlerExecuted).toBe(false);
    expect(result.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "LIVE_QUEUE_UNSAFE_IDEMPOTENCY_REFERENCE",
        "LIVE_QUEUE_UNSAFE_LEASE_REFERENCE",
        "LIVE_QUEUE_UNSAFE_PAYLOAD_REFERENCE",
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("ELF_SECRET");
    expect(JSON.stringify(result)).not.toContain("secret-worker-token");
  });

  it("retries retryable failures before the max attempt and dead-letters at the max attempt", () => {
    const retryableHandler: LiveQueueHandler = {
      handle: () => ({ diagnosticCodes: ["LIVE_QUEUE_HANDLER_RETRYABLE_FAILURE"], status: "retryable_failure" }),
      handlerId: "retryable-handler",
      jobIds: ["task-verification-worker"],
    };
    const foundation = createReadyReadiness(retryableHandler);
    const retryResult = evaluateLiveQueueConsumeMessage(safeMessage, { readiness: foundation });
    const deadLetterResult = evaluateLiveQueueConsumeMessage(
      { ...safeMessage, attempt: 3, traceId: "trace-live-consume-max-attempt" },
      { readiness: foundation },
    );

    expect(retryResult).toMatchObject({
      decision: "retry",
      deadLetterAttempted: false,
      retryScheduled: true,
      status: "accepted",
    });
    expect(deadLetterResult).toMatchObject({
      decision: "dead_letter",
      deadLetterAttempted: true,
      retryScheduled: false,
      status: "failed",
    });
  });

  it("handles duplicate and lease-conflict outcomes without acking successful completion", () => {
    const duplicateFoundation = createReadyReadiness({
      handle: () => ({ status: "duplicate" }),
      handlerId: "duplicate-handler",
      jobIds: ["task-verification-worker"],
    });
    const leaseConflictFoundation = createReadyReadiness({
      handle: () => ({ status: "lease_conflict" }),
      handlerId: "lease-conflict-handler",
      jobIds: ["task-verification-worker"],
    });

    const duplicateResult = evaluateLiveQueueConsumeMessage(safeMessage, { readiness: duplicateFoundation });
    const leaseConflictResult = evaluateLiveQueueConsumeMessage(safeMessage, { readiness: leaseConflictFoundation });

    expect(duplicateResult).toMatchObject({
      ackAttempted: false,
      decision: "drop_duplicate",
      handlerExecuted: true,
      status: "duplicate_existing",
    });
    expect(leaseConflictResult).toMatchObject({
      ackAttempted: false,
      decision: "retry",
      handlerExecuted: true,
      status: "lease_conflict",
    });
  });

  it("redacts thrown consumer and handler errors", () => {
    const throwingConsumer: LiveQueueConsumer = {
      ...consumer,
      reserve: () => {
        throw new Error("redis://redis-user:redis-pass@redis.invalid/0 payload={\"wallet\":\"ELF_SECRET\"}");
      },
    };
    const throwingHandler: LiveQueueHandler = {
      handle: () => {
        throw new Error("handler token=secret payload={\"walletAddress\":\"ELF_SECRET\"}");
      },
      handlerId: "throwing-handler",
      jobIds: ["task-verification-worker"],
    };

    const consumerResult = evaluateLiveQueueConsumeMessage(safeMessage, {
      readiness: createReadyReadiness(completedHandler, throwingConsumer),
    });
    const handlerResult = evaluateLiveQueueConsumeMessage(safeMessage, {
      readiness: createReadyReadiness(throwingHandler),
    });

    expect(consumerResult).toMatchObject({
      decision: "retry",
      diagnosticCodes: ["LIVE_QUEUE_CONSUMER_FAILED"],
      handlerExecuted: false,
      status: "failed",
    });
    expect(handlerResult).toMatchObject({
      decision: "retry",
      diagnosticCodes: ["LIVE_QUEUE_HANDLER_FAILED"],
      handlerExecuted: true,
      status: "failed",
    });
    expect(JSON.stringify(consumerResult)).not.toContain("redis-pass");
    expect(JSON.stringify(handlerResult)).not.toContain("ELF_SECRET");
  });

  it("redacts nested consume payloads", () => {
    const redacted = redactLiveQueueConsumeValue({
      idempotencyKey: "campaign/wallet/ELF_raw_wallet/task.json",
      leaseToken: "lease-token=secret-worker-token",
      nested: {
        payload: "{\"walletAddress\":\"ELF_payload_wallet\",\"taskId\":\"task_raw\"}",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
      },
      redisUrl: "redis://redis-user:redis-pass@redis.invalid:6379/0",
      token: "Bearer secret-token",
      walletAddress: "ELF_raw_wallet",
    });

    expect(redacted).toEqual({
      idempotencyKey: "[redacted]",
      leaseToken: "[redacted]",
      nested: {
        payload: "[redacted]",
        signedUrl: "[redacted]",
      },
      redisUrl: "[redacted]",
      token: "[redacted]",
      walletAddress: "[redacted]",
    });
  });
});
