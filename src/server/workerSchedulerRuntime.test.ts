import { describe, expect, it } from "vitest";
import {
  workerLeaseOperationCapabilities,
  workerLeaseStoreNoLiveFlags,
  workerLeaseStoreProductionPreconditions,
} from "./workerLeaseStore";
import {
  SUPPORTED_WORKER_SCHEDULER_PROFILES,
  createWorkerSchedulerFoundation,
  redactWorkerSchedulerValue,
  workerJobCatalog,
  workerSchedulerNoLiveFlags,
  workerSchedulerProductionPreconditions,
  workerSchedulerTriggerSources,
} from "./workerSchedulerRuntime";

describe("worker scheduler runtime foundation", () => {
  it("declares a stable foundation id and supported runtime profiles", () => {
    const foundation = createWorkerSchedulerFoundation();

    expect(foundation.id).toBe("campaign-os-worker-scheduler-foundation");
    expect(SUPPORTED_WORKER_SCHEDULER_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
  });

  it("covers the worker job families required by v0.1 and v0.2", () => {
    expect(workerJobCatalog.map((job) => job.family)).toEqual([
      "task_verification",
      "campaign_lifecycle",
      "eligibility_refresh",
      "export_preparation",
      "analytics_ingestion_handoff",
      "ai_ops_report",
      "stale_review_cleanup",
      "contract_sync_handoff",
      "reward_distribution_handoff",
    ]);
    expect(workerJobCatalog.map((job) => job.id)).toEqual([
      "task-verification-worker",
      "campaign-lifecycle-worker",
      "eligibility-refresh-worker",
      "export-preparation-worker",
      "analytics-ingestion-handoff-worker",
      "ai-ops-report-worker",
      "stale-review-cleanup-worker",
      "contract-sync-handoff-worker",
      "reward-distribution-handoff-worker",
    ]);
  });

  it("covers canonical trigger sources for scheduler policies", () => {
    const foundation = createWorkerSchedulerFoundation();

    expect(workerSchedulerTriggerSources).toEqual([
      "manual",
      "api_request",
      "campaign_time",
      "recurring",
      "retry",
      "operator_triggered",
    ]);
    expect(foundation.readiness.triggerSourceCount).toBe(workerSchedulerTriggerSources.length);
    expect(foundation.schedulerPolicies.map((policy) => policy.triggerSource)).toEqual([
      "api_request",
      "campaign_time",
      "recurring",
      "operator_triggered",
      "recurring",
      "recurring",
      "operator_triggered",
      "operator_triggered",
      "operator_triggered",
    ]);
  });

  it("keeps local review deterministic, valid, and free of live execution", () => {
    const startedAt = performance.now();
    const foundation = createWorkerSchedulerFoundation({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.noLiveFlags).toEqual(workerSchedulerNoLiveFlags);
    expect(foundation.readiness).toMatchObject({
      blockerCount: 0,
      leaseStoreBlockerCount: 0,
      leaseStoreDiagnosticCodes: [],
      leaseStoreId: "local-dry-run",
      leaseStoreLiveQueuePublishingEnabled: false,
      leaseStoreLiveWorkerExecutionEnabled: false,
      leaseStoreMode: "dry_run",
      leaseStoreStatus: "local_ready",
      jobCatalogCount: 9,
      jobFamilyCount: 9,
      localReviewReady: true,
      productionReady: false,
      schedulePolicyCount: 9,
    });
    expect(foundation.diagnosticCodes).toEqual([]);
  });

  it("projects worker lease store readiness without enabling live scheduler or worker execution", () => {
    const foundation = createWorkerSchedulerFoundation({ profileId: "local-review" });

    expect(foundation.leaseStore).toMatchObject({
      adapterId: "local-dry-run-worker-lease-store-adapter",
      blockerCount: 0,
      diagnosticCodes: [],
      disabledLiveOperationCount: workerLeaseOperationCapabilities.length,
      heartbeatIntervalSeconds: 30,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      mode: "dry_run",
      operationCount: workerLeaseOperationCapabilities.length,
      productionReady: false,
      requiredConfigKeys: expect.arrayContaining([
        "CAMPAIGN_OS_WORKER_LEASE_STORE",
        "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS",
        "CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS",
      ]),
      status: "local_ready",
      storeId: "local-dry-run",
      ttlSeconds: 120,
      valid: true,
    });
    expect(foundation.leaseStore.noLiveFlags).toEqual(workerLeaseStoreNoLiveFlags);
    expect(foundation.leaseStore.operationCapabilities.every((capability) => capability.liveEnabled === false)).toBe(
      true,
    );
    expect(foundation.leaseStore.requiredConfigKeys).toHaveLength(
      new Set(workerLeaseStoreProductionPreconditions.flatMap((item) => item.requiredConfigKeys)).size,
    );
    expect(foundation.readiness.leaseStoreRequiredConfigKeys).toEqual(
      foundation.leaseStore.requiredConfigKeys,
    );
    expect(foundation.readiness.leaseStoreLiveQueuePublishingEnabled).toBe(false);
    expect(foundation.readiness.leaseStoreLiveWorkerExecutionEnabled).toBe(false);
    expect(foundation.readiness.liveSchedulerExecutionEnabled).toBe(false);
    expect(foundation.readiness.liveWorkerExecutionEnabled).toBe(false);
  });

  it("keeps every worker, scheduler, queue, cron, and live integration flag disabled", () => {
    expect(workerSchedulerNoLiveFlags).toEqual({
      liveAiCallsEnabled: false,
      liveAnalyticsIngestionEnabled: false,
      liveContractCallsEnabled: false,
      liveCronExecutionEnabled: false,
      liveObjectStorageEnabled: false,
      liveProviderCallsEnabled: false,
      liveQueuePublishingEnabled: false,
      liveRewardDistributionEnabled: false,
      liveSchedulerExecutionEnabled: false,
      liveSocialCallsEnabled: false,
      liveWorkerExecutionEnabled: false,
    });

    const foundation = createWorkerSchedulerFoundation({ profileId: "staging-scaffold" });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(workerSchedulerNoLiveFlags);
  });

  it("fails closed for production-required when worker/scheduler preconditions are missing", () => {
    const foundation = createWorkerSchedulerFoundation({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(workerSchedulerProductionPreconditions.length);
    expect(foundation.diagnosticCodes).toEqual([
      "WORKER_QUEUE_MISSING",
      "SCHEDULER_ENDPOINT_MISSING",
      "RETRY_BACKOFF_POLICY_MISSING",
      "IDEMPOTENCY_STORE_MISSING",
      "WORKER_LEASE_MISSING",
      "OBSERVABILITY_MISSING",
      "PROVIDER_HANDOFF_MISSING",
    ]);
    expect(foundation.diagnostics.map((diagnostic) => diagnostic.severity)).toEqual([
      "error",
      "error",
      "error",
      "error",
      "error",
      "error",
      "error",
    ]);
  });

  it("validates policy references and protects duplicate side-effect boundaries", () => {
    const foundation = createWorkerSchedulerFoundation();

    expect(foundation.diagnostics).toEqual([]);
    expect(foundation.retryBackoffPolicies.flatMap((policy) => policy.duplicateSideEffectRisk)).toEqual(
      expect.arrayContaining([
        "duplicate_points",
        "duplicate_exports",
        "duplicate_reward_handoff",
        "duplicate_contract_sync",
        "duplicate_analytics_ingestion",
      ]),
    );
    expect(foundation.idempotencyPolicies.every((policy) => policy.requiresStore === true)).toBe(
      true,
    );
  });

  it("redacts queue URLs, scheduler credentials, lease tokens, signed URLs, object keys, and raw job payloads", () => {
    const rawFixture = {
      bearerToken: "Bearer worker-token-456",
      jobPayload: "{\"walletAddress\":\"ELF_raw_wallet\",\"taskId\":\"task_raw\"}",
      leaseToken: "lease-token-000",
      nested: {
        objectKey: "tenant/raw/export.csv",
        providerPayload: "{\"address\":\"ELF_provider_payload\",\"score\":99}",
        schedulerEndpoint: "https://scheduler-user:scheduler-pass@scheduler.invalid/run?token=secret",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        webhookSecret: "hook-secret-000",
      },
      queueUrl: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
    };

    const redacted = redactWorkerSchedulerValue(rawFixture);
    const foundation = createWorkerSchedulerFoundation({
      env: {
        CAMPAIGN_OS_WORKER_QUEUE_URL: rawFixture.queueUrl,
        CAMPAIGN_OS_SCHEDULER_ENDPOINT: rawFixture.nested.schedulerEndpoint,
        CAMPAIGN_OS_WORKER_SAMPLE_PAYLOAD: rawFixture.jobPayload,
      },
      profileId: "production-required",
    });
    const serialized = JSON.stringify({ foundation, redacted });

    expect(serialized).not.toContain("worker-token-456");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).not.toContain("task_raw");
    expect(serialized).not.toContain("lease-token-000");
    expect(serialized).not.toContain("tenant/raw/export.csv");
    expect(serialized).not.toContain("ELF_provider_payload");
    expect(serialized).not.toContain("scheduler-user");
    expect(serialized).not.toContain("scheduler-pass");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("hook-secret-000");
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret");
    expect(serialized).toContain("[redacted]");
  });

  it("fails closed for unsupported worker scheduler profiles", () => {
    const foundation = createWorkerSchedulerFoundation({ profileId: "live-worker" });

    expect(foundation.profileId).toBe("production-required");
    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.diagnosticCodes[0]).toBe("UNKNOWN_WORKER_SCHEDULER_PROFILE");
    expect(JSON.stringify(foundation)).not.toContain("live-worker-secret");
  });
});
