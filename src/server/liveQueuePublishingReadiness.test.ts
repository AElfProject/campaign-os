import { describe, expect, it } from "vitest";
import {
  createLiveQueuePublishingReadiness,
  evaluateLiveQueuePublishRequest,
  liveQueuePublishingNoLiveSideEffects,
  liveQueuePublishingProductionPreconditions,
  redactLiveQueuePublishingValue,
  type LiveQueuePublisher,
  type LiveQueuePublishingDiagnosticCode,
} from "./liveQueuePublishingReadiness";

const productionReadyPublishingEnv = {
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY: "factory-ref:bullmq-construction",
  CAMPAIGN_OS_DEAD_LETTER_QUEUE: "queue-ref:dead-letter",
  CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-ref:store",
  CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:publishing",
  CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:publishing",
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
  CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-ref:store",
  CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
} satisfies Record<string, unknown>;

const missingProductionDiagnosticCodes: LiveQueuePublishingDiagnosticCode[] = [
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

describe("live queue publishing readiness foundation", () => {
  it("keeps local review deterministic, server-only, and no-live", () => {
    const startedAt = performance.now();
    const foundation = createLiveQueuePublishingReadiness({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.id).toBe("campaign-os-live-queue-publishing-readiness");
    expect(foundation).toMatchObject({
      activationStatus: "disabled",
      blockerCount: 0,
      livePublishAttempted: false,
      liveQueuePublishingEnabled: false,
      mode: "dry_run",
      productionReady: false,
      profileId: "local-review",
      publishAttemptAllowed: false,
      publisherId: "not_configured",
      publisherProvided: false,
      status: "disabled",
      valid: true,
    });
    expect(foundation.noLiveSideEffects).toEqual(liveQueuePublishingNoLiveSideEffects);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.readiness).toMatchObject({
      livePublishAttempted: false,
      liveQueuePublishingEnabled: false,
      productionReady: false,
      publishAttemptAllowed: false,
      status: "disabled",
      valid: true,
    });
    expect(Object.values(foundation.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("fails closed for production-required when publishing preconditions are missing", () => {
    const foundation = createLiveQueuePublishingReadiness({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.publishAttemptAllowed).toBe(false);
    expect(foundation.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.publisherProvided).toBe(false);
    expect(foundation.blockerCount).toBe(liveQueuePublishingProductionPreconditions.length + 14);
    expect(foundation.diagnosticCodes).toEqual(missingProductionDiagnosticCodes);
    expect(foundation.bullmqConstruction.status).toBe("blocked");
    expect(foundation.brokerReadiness.status).toBe("blocked");
  });

  it("publishes a safe request only through an injected publisher", () => {
    const publisher: LiveQueuePublisher = {
      publish: (request) => ({
        operationId: `publish-${request.queueId}-${request.jobId}`,
        providerReference: "provider-ref:accepted",
        status: "accepted",
      }),
      publisherId: "test-live-queue-publisher",
    };

    const foundation = createLiveQueuePublishingReadiness({
      env: productionReadyPublishingEnv,
      profileId: "production-required",
      publisher,
    });
    const result = evaluateLiveQueuePublishRequest(
      {
        attempt: 1,
        idempotencyReference: "idem-ref:campaign-task-1",
        jobId: "task-verification-worker",
        payloadHash: "sha256:1234",
        payloadReference: "payload-ref:task-1",
        queueId: "verification-jobs",
        requestedAt: "2026-07-08T07:00:00Z",
        traceId: "trace-live-publish-1",
      },
      { readiness: foundation },
    );

    expect(foundation.status).toBe("ready");
    expect(foundation.valid).toBe(true);
    expect(foundation.liveQueuePublishingEnabled).toBe(true);
    expect(foundation.publishAttemptAllowed).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(result).toMatchObject({
      jobId: "task-verification-worker",
      livePublishAttempted: true,
      operationId: "publish-verification-jobs-task-verification-worker",
      providerReference: "provider-ref:accepted",
      published: true,
      queueId: "verification-jobs",
      status: "accepted",
      traceId: "trace-live-publish-1",
    });
    expect(Object.values(result.noLiveSideEffects).every((value) => value === false)).toBe(true);
  });

  it("rejects duplicate publish results without reporting a publish", () => {
    const publisher: LiveQueuePublisher = {
      publish: () => ({
        diagnosticCodes: ["LIVE_QUEUE_DUPLICATE_IDEMPOTENCY_REFERENCE"],
        operationId: "publish-duplicate",
        status: "duplicate",
      }),
      publisherId: "duplicate-live-queue-publisher",
    };
    const foundation = createLiveQueuePublishingReadiness({
      env: productionReadyPublishingEnv,
      profileId: "production-required",
      publisher,
    });
    const result = evaluateLiveQueuePublishRequest(
      {
        attempt: 1,
        idempotencyReference: "idem-ref:duplicate",
        jobId: "task-verification-worker",
        payloadReference: "payload-ref:task-1",
        queueId: "verification-jobs",
        traceId: "trace-duplicate",
      },
      { readiness: foundation },
    );

    expect(result.status).toBe("duplicate");
    expect(result.livePublishAttempted).toBe(true);
    expect(result.published).toBe(false);
    expect(result.diagnosticCodes).toEqual(["LIVE_QUEUE_DUPLICATE_IDEMPOTENCY_REFERENCE"]);
  });

  it("rejects unsafe publish requests before the publisher is called", () => {
    let publisherCalled = false;
    const publisher: LiveQueuePublisher = {
      publish: () => {
        publisherCalled = true;
        return { status: "accepted" };
      },
      publisherId: "test-live-queue-publisher",
    };
    const foundation = createLiveQueuePublishingReadiness({
      env: productionReadyPublishingEnv,
      profileId: "production-required",
      publisher,
    });
    const result = evaluateLiveQueuePublishRequest(
      {
        attempt: 1,
        idempotencyReference: "campaign/wallet/ELF_secret_wallet/task.json",
        jobId: "task-verification-worker",
        payloadReference: "{\"wallet\":\"ELF_SECRET\",\"payload\":true}",
        queueId: "verification-jobs",
        traceId: "trace-unsafe",
      },
      { readiness: foundation },
    );

    expect(publisherCalled).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.livePublishAttempted).toBe(false);
    expect(result.published).toBe(false);
    expect(result.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "LIVE_QUEUE_UNSAFE_IDEMPOTENCY_REFERENCE",
        "LIVE_QUEUE_UNSAFE_PAYLOAD_REFERENCE",
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("ELF_SECRET");
    expect(JSON.stringify(result)).not.toContain("ELF_secret_wallet");
  });

  it("redacts thrown publisher errors without escaping the publisher boundary", () => {
    const publisher: LiveQueuePublisher = {
      publish: () => {
        throw new Error("redis://redis-user:redis-pass@redis.invalid:6379/0 payload={\"wallet\":\"ELF_SECRET\"}");
      },
      publisherId: "throwing-live-queue-publisher",
    };
    const foundation = createLiveQueuePublishingReadiness({
      env: productionReadyPublishingEnv,
      profileId: "production-required",
      publisher,
    });
    const result = evaluateLiveQueuePublishRequest(
      {
        attempt: 1,
        idempotencyReference: "idem-ref:campaign-task-1",
        jobId: "task-verification-worker",
        payloadReference: "payload-ref:task-1",
        queueId: "verification-jobs",
        traceId: "trace-publisher-failure",
      },
      { readiness: foundation },
    );

    expect(result.status).toBe("failed");
    expect(result.livePublishAttempted).toBe(true);
    expect(result.published).toBe(false);
    expect(result.diagnosticCodes).toEqual(["LIVE_QUEUE_PUBLISHER_FAILED"]);
    expect(JSON.stringify(result)).not.toContain("redis-pass");
    expect(JSON.stringify(result)).not.toContain("ELF_SECRET");
  });

  it("redacts nested publishing payloads", () => {
    const redacted = redactLiveQueuePublishingValue({
      idempotencyKey: "campaign/wallet/ELF_raw_wallet/task.json",
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
