import { describe, expect, it } from "vitest";
import {
  SUPPORTED_BULLMQ_CONSTRUCTION_PROFILES,
  bullmqConstructionNoLiveFlags,
  bullmqConstructionProductionPreconditions,
  createBullmqConstructionReadiness,
  getBullmqConstructionReadinessRegistration,
  redactBullmqConstructionValue,
  type BullmqConstructionDiagnosticCode,
  type BullmqConstructionFactory,
} from "./bullmqConstructionReadiness";

const productionReadyConstructionEnv = {
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY: "factory-ref:bullmq-construction",
  CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:bullmq-construction",
  CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:bullmq-construction",
  CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "circuit-breaker:fail-closed",
  CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "2500",
  CAMPAIGN_OS_REDIS_CREDENTIALS: "credential-ref:redis-broker",
  CAMPAIGN_OS_REDIS_DATABASE: "database-ref:0",
  CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "retry-backoff:exponential",
  CAMPAIGN_OS_REDIS_TLS_POLICY: "tls-policy:required",
  CAMPAIGN_OS_REDIS_URL: "redis-endpoint-ref:campaign-os",
} satisfies Record<string, unknown>;

const missingProductionDiagnosticCodes: BullmqConstructionDiagnosticCode[] = [
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

describe("BullMQ construction readiness foundation", () => {
  it("keeps local review deterministic, server-only, and no-live", () => {
    const startedAt = performance.now();
    const foundation = createBullmqConstructionReadiness({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;
    const registration = getBullmqConstructionReadinessRegistration("bullmq-construction-local");

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.id).toBe("campaign-os-bullmq-construction-readiness");
    expect(SUPPORTED_BULLMQ_CONSTRUCTION_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
    expect(registration).toMatchObject({
      activationStatus: "disabled",
      constructionId: "bullmq-construction-local",
      factoryId: "not_configured",
      mode: "dry_run",
      status: "local_ready",
    });
    expect(foundation).toMatchObject({
      activationStatus: "disabled",
      blockerCount: 0,
      browserBundleAllowed: false,
      bullmqConstructionAttempted: false,
      bullmqConstructionFactoryInvoked: false,
      constructionId: "bullmq-construction-local",
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      mode: "dry_run",
      productionReady: false,
      profileId: "local-review",
      queueClientConstructed: false,
      queueEventsConstructed: false,
      status: "local_ready",
      valid: true,
      workerConstructed: false,
    });
    expect(foundation.noLiveFlags).toEqual(bullmqConstructionNoLiveFlags);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.queueClient).toMatchObject({
      constructionAttempted: false,
      constructed: false,
      kind: "queue",
      liveOperationStarted: false,
    });
    expect(foundation.worker).toMatchObject({
      constructionAttempted: false,
      constructed: false,
      kind: "worker",
      liveOperationStarted: false,
    });
    expect(foundation.queueEvents).toMatchObject({
      constructionAttempted: false,
      constructed: false,
      kind: "queue_events",
      liveOperationStarted: false,
    });
    expect(foundation.readiness).toMatchObject({
      browserBundleAllowed: false,
      bullmqConstructionAttempted: false,
      bullmqConstructionFactoryInvoked: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
      queueClientConstructed: false,
      queueEventsConstructed: false,
      valid: true,
      workerConstructed: false,
    });
  });

  it("fails closed for production-required when construction and broker preconditions are missing", () => {
    const foundation = createBullmqConstructionReadiness({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(bullmqConstructionProductionPreconditions.length + 10);
    expect(foundation.diagnosticCodes).toEqual(missingProductionDiagnosticCodes);
    expect(foundation.activationStatus).toBe("activation_required");
    expect(foundation.factoryProvided).toBe(false);
    expect(foundation.brokerReadiness.status).toBe("blocked");
    expect(foundation.queueClientConstructed).toBe(false);
    expect(foundation.workerConstructed).toBe(false);
    expect(foundation.queueEventsConstructed).toBe(false);
    expect(foundation.bullmqConstructionFactoryInvoked).toBe(false);
  });

  it("constructs Queue, Worker, and QueueEvents only through an injected factory", () => {
    const constructionFactory: BullmqConstructionFactory = {
      factoryId: "test-bullmq-construction-factory",
      construct: () => ({
        queueClient: { clientId: "queue-client-ref", constructed: true, optionReferenceId: "queue-options-ref" },
        queueEvents: { clientId: "queue-events-ref", constructed: true, optionReferenceId: "events-options-ref" },
        worker: { clientId: "worker-client-ref", constructed: true, optionReferenceId: "worker-options-ref" },
      }),
    };

    const foundation = createBullmqConstructionReadiness({
      constructionFactory,
      env: productionReadyConstructionEnv,
      profileId: "production-required",
    });

    expect(foundation.status).toBe("constructed");
    expect(foundation.valid).toBe(true);
    expect(foundation.activationStatus).toBe("explicitly_enabled");
    expect(foundation.factoryProvided).toBe(true);
    expect(foundation.bullmqConstructionAttempted).toBe(true);
    expect(foundation.bullmqConstructionFactoryInvoked).toBe(true);
    expect(foundation.queueClientConstructed).toBe(true);
    expect(foundation.workerConstructed).toBe(true);
    expect(foundation.queueEventsConstructed).toBe(true);
    expect(foundation.queueClient.clientId).toBe("queue-client-ref");
    expect(foundation.worker.clientId).toBe("worker-client-ref");
    expect(foundation.queueEvents.clientId).toBe("queue-events-ref");
    expect(foundation.productionReady).toBe(false);
    expect(foundation.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.liveWorkerExecutionEnabled).toBe(false);
    expect(foundation.noLiveFlags.liveSchedulerExecutionEnabled).toBe(false);
  });

  it("reports partial construction without enabling live worker execution", () => {
    const constructionFactory: BullmqConstructionFactory = {
      factoryId: "partial-bullmq-construction-factory",
      construct: () => ({
        queueClient: { clientId: "queue-client-ref", constructed: true, optionReferenceId: "queue-options-ref" },
        queueEvents: { constructed: false, diagnosticCode: "BULLMQ_QUEUE_EVENTS_CONSTRUCTION_FAILED" },
        worker: { constructed: false, diagnosticCode: "BULLMQ_WORKER_CONSTRUCTION_FAILED" },
      }),
    };

    const foundation = createBullmqConstructionReadiness({
      constructionFactory,
      env: productionReadyConstructionEnv,
      profileId: "production-required",
    });

    expect(foundation.status).toBe("partial");
    expect(foundation.valid).toBe(false);
    expect(foundation.queueClientConstructed).toBe(true);
    expect(foundation.workerConstructed).toBe(false);
    expect(foundation.queueEventsConstructed).toBe(false);
    expect(foundation.diagnosticCodes).toEqual([
      "BULLMQ_WORKER_CONSTRUCTION_FAILED",
      "BULLMQ_QUEUE_EVENTS_CONSTRUCTION_FAILED",
    ]);
    expect(foundation.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.liveWorkerExecutionEnabled).toBe(false);
  });

  it("redacts thrown factory errors without escaping the injected factory boundary", () => {
    const constructionFactory: BullmqConstructionFactory = {
      factoryId: "throwing-bullmq-construction-factory",
      construct: () => {
        throw new Error("redis://redis-user:redis-pass@redis.invalid:6379/0 payload={\"wallet\":\"ELF_SECRET\"}");
      },
    };

    const foundation = createBullmqConstructionReadiness({
      constructionFactory,
      env: productionReadyConstructionEnv,
      profileId: "production-required",
    });

    expect(foundation.status).toBe("failed");
    expect(foundation.valid).toBe(false);
    expect(foundation.diagnosticCodes).toEqual(
      expect.arrayContaining(["BULLMQ_CONSTRUCTION_FACTORY_FAILED"]),
    );
    expect(JSON.stringify(foundation)).not.toContain("redis-pass");
    expect(JSON.stringify(foundation)).not.toContain("ELF_SECRET");
    expect(foundation.queueClientConstructed).toBe(false);
    expect(foundation.workerConstructed).toBe(false);
    expect(foundation.queueEventsConstructed).toBe(false);
  });

  it("blocks unsafe construction config values and redacts serialized output", () => {
    const constructionFactory: BullmqConstructionFactory = {
      factoryId: "redis://redis-user:redis-pass@redis.invalid/0?token=secret",
      construct: () => ({
        queueClient: { clientId: "queue-client-ref", constructed: true },
        queueEvents: { clientId: "queue-events-ref", constructed: true },
        worker: { clientId: "worker-client-ref", constructed: true },
      }),
    };

    const foundation = createBullmqConstructionReadiness({
      constructionFactory,
      constructionId: "redis://redis-user:redis-pass@redis.invalid/0?token=secret",
      env: {
        ...productionReadyConstructionEnv,
        CAMPAIGN_OS_BULLMQ_CONSTRUCTION_FACTORY: "redis://redis-user:redis-pass@redis.invalid/0",
      },
      profileId: "production-required",
    });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.diagnosticCodes).toEqual(
      expect.arrayContaining(["BULLMQ_CONSTRUCTION_UNSAFE_CONFIG"]),
    );
    expect(foundation.bullmqConstructionFactoryInvoked).toBe(false);
    expect(foundation.factoryId).toBe("[redacted]");
    expect(foundation.readiness.factoryId).toBe("[redacted]");
    expect(JSON.stringify(foundation)).not.toContain("redis-pass");
    expect(JSON.stringify(foundation)).not.toContain("token=secret");
  });

  it("redacts nested BullMQ construction payloads", () => {
    const redacted = redactBullmqConstructionValue({
      jobData: "{\"wallet\":\"ELF_PRIVATE\",\"payload\":true}",
      password: "redis-pass",
      redisUrl: "redis://redis-user:redis-pass@redis.invalid:6379/0",
      stack: "Error: redis-pass\n at worker",
      token: "Bearer secret-token",
    });

    expect(redacted).toEqual({
      jobData: "[redacted]",
      password: "[redacted]",
      redisUrl: "[redacted]",
      stack: "[redacted]",
      token: "[redacted]",
    });
  });

  it("does not expose a registration for unknown construction ids", () => {
    expect(getBullmqConstructionReadinessRegistration("unknown-construction")).toBeUndefined();
  });
});
