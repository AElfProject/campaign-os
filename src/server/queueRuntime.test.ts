import { describe, expect, it } from "vitest";
import {
  SUPPORTED_QUEUE_RUNTIME_PROFILES,
  createQueueRuntimeFoundation,
  dryRunQueueEnqueue,
  queueRuntimeNoLiveFlags,
  queueRuntimePlans,
  queueRuntimeProductionPreconditions,
  redactQueueRuntimeValue,
} from "./queueRuntime";
import {
  workerJobCatalog,
  workerSchedulerPolicies,
} from "./workerSchedulerRuntime";

describe("queue runtime foundation", () => {
  it("declares a stable foundation id and supported runtime profiles", () => {
    const foundation = createQueueRuntimeFoundation();

    expect(foundation.id).toBe("campaign-os-queue-runtime-foundation");
    expect(SUPPORTED_QUEUE_RUNTIME_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
  });

  it("derives one deterministic queue plan for every worker scheduler job", () => {
    expect(queueRuntimePlans.map((plan) => plan.jobId)).toEqual(workerJobCatalog.map((job) => job.id));
    expect(queueRuntimePlans).toHaveLength(9);
    expect(new Set(queueRuntimePlans.map((plan) => plan.jobId)).size).toBe(9);
    expect(queueRuntimePlans.every((plan) => plan.livePublishingEnabled === false)).toBe(true);

    for (const schedulerPolicy of workerSchedulerPolicies) {
      const queuePlan = queueRuntimePlans.find((plan) => plan.jobId === schedulerPolicy.jobId);

      expect(queuePlan).toMatchObject({
        idempotencyPolicyId: schedulerPolicy.idempotencyPolicyId,
        retryPolicyId: schedulerPolicy.retryPolicyId,
      });
    }
  });

  it("keeps local review deterministic, valid, and free of live execution", () => {
    const startedAt = performance.now();
    const foundation = createQueueRuntimeFoundation({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(queueRuntimeNoLiveFlags);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.readiness).toMatchObject({
      dryRunEnqueueEnabled: true,
      liveQueuePublishingEnabled: false,
      productionReady: false,
      queuePlanCount: 9,
    });
    expect(foundation.providerAdapter).toMatchObject({
      adapterId: "local-dry-run-queue-provider-adapter",
      blockerCount: 0,
      diagnosticCodes: [],
      liveQueuePublishingEnabled: false,
      mode: "dry_run",
      productionReady: false,
      providerId: "local-dry-run",
      status: "local_ready",
      valid: true,
    });
    expect(foundation.readiness).toMatchObject({
      providerAdapterBlockerCount: 0,
      providerAdapterDiagnosticCodes: [],
      providerAdapterId: "local-dry-run-queue-provider-adapter",
      providerAdapterMode: "dry_run",
      providerAdapterStatus: "local_ready",
      providerId: "local-dry-run",
    });
  });

  it("keeps every queue, worker, scheduler, cron, and live integration flag disabled", () => {
    expect(queueRuntimeNoLiveFlags).toEqual({
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

    const foundation = createQueueRuntimeFoundation({ profileId: "staging-scaffold" });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(queueRuntimeNoLiveFlags);
  });

  it("fails closed for production-required when queue preconditions are missing", () => {
    const foundation = createQueueRuntimeFoundation({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(queueRuntimeProductionPreconditions.length);
    expect(foundation.diagnosticCodes).toEqual([
      "QUEUE_PROVIDER_MISSING",
      "QUEUE_URL_MISSING",
      "QUEUE_RETRY_POLICY_MISSING",
      "QUEUE_IDEMPOTENCY_STORE_MISSING",
      "QUEUE_WORKER_LEASE_MISSING",
      "QUEUE_OBSERVABILITY_MISSING",
      "QUEUE_PROVIDER_HANDOFF_MISSING",
      "QUEUE_DEAD_LETTER_MISSING",
    ]);
    expect(foundation.providerAdapter.status).toBe("blocked");
    expect(foundation.providerAdapter.productionReady).toBe(false);
    expect(foundation.providerAdapter.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.providerAdapter.diagnosticCodes).toEqual([
      "QUEUE_PROVIDER_UNSUPPORTED",
      "QUEUE_PROVIDER_MISSING",
      "QUEUE_PROVIDER_ENDPOINT_MISSING",
      "QUEUE_PROVIDER_CREDENTIALS_MISSING",
      "QUEUE_PROVIDER_ENDPOINT_MISSING",
      "QUEUE_PROVIDER_DEAD_LETTER_MISSING",
      "QUEUE_PROVIDER_RETRY_POLICY_MISSING",
      "QUEUE_PROVIDER_IDEMPOTENCY_STORE_MISSING",
      "QUEUE_PROVIDER_WORKER_LEASE_MISSING",
      "QUEUE_PROVIDER_OBSERVABILITY_MISSING",
    ]);
    expect(foundation.readiness.providerAdapterBlockerCount).toBe(foundation.providerAdapter.blockerCount);
  });

  it("accepts a safe known dry-run enqueue request without live publishing", () => {
    const beforePlans = createQueueRuntimeFoundation().queuePlans.map((plan) => plan.jobId);
    const result = dryRunQueueEnqueue({
      attempt: 1,
      idempotencyKey: "idempotency:campaign-task-verification",
      jobId: "task-verification-worker",
      payloadReference: "payload-ref:sha256:task-verification-safe",
      queueId: "verification-jobs",
      requestedAt: "2026-07-07T13:30:00Z",
      traceId: "trace-queue-runtime-test",
    });

    expect(result).toMatchObject({
      accepted: true,
      degradedOutcome: "pending",
      diagnosticCodes: [],
      jobId: "task-verification-worker",
      livePublishAttempted: false,
      liveQueuePublishingEnabled: false,
      payloadReference: "payload-ref:sha256:task-verification-safe",
      queueId: "verification-jobs",
      status: "accepted_dry_run",
      traceId: "trace-queue-runtime-test",
    });
    expect(createQueueRuntimeFoundation().queuePlans.map((plan) => plan.jobId)).toEqual(beforePlans);
  });

  it("rejects unknown jobs, mismatched queues, invalid attempts, missing trace ids, and unsafe payload references", () => {
    const cases = [
      {
        expectedCode: "UNKNOWN_QUEUE_JOB",
        request: {
          attempt: 1,
          idempotencyKey: "idempotency:unknown",
          jobId: "unknown-worker",
          payloadReference: "payload-ref:sha256:unknown",
          queueId: "verification-jobs",
          traceId: "trace-unknown",
        },
      },
      {
        expectedCode: "MISMATCHED_QUEUE_JOB",
        request: {
          attempt: 1,
          idempotencyKey: "idempotency:mismatch",
          jobId: "task-verification-worker",
          payloadReference: "payload-ref:sha256:mismatch",
          queueId: "reward-jobs",
          traceId: "trace-mismatch",
        },
      },
      {
        expectedCode: "INVALID_ATTEMPT",
        request: {
          attempt: 99,
          idempotencyKey: "idempotency:attempt",
          jobId: "task-verification-worker",
          payloadReference: "payload-ref:sha256:attempt",
          queueId: "verification-jobs",
          traceId: "trace-attempt",
        },
      },
      {
        expectedCode: "MISSING_TRACE_ID",
        request: {
          attempt: 1,
          idempotencyKey: "idempotency:trace",
          jobId: "task-verification-worker",
          payloadReference: "payload-ref:sha256:trace",
          queueId: "verification-jobs",
          traceId: " ",
        },
      },
      {
        expectedCode: "UNSAFE_PAYLOAD_REFERENCE",
        request: {
          attempt: 1,
          idempotencyKey: "idempotency:payload",
          jobId: "task-verification-worker",
          payloadReference: "{\"walletAddress\":\"ELF_raw_wallet\",\"taskId\":\"task_raw\"}",
          queueId: "verification-jobs",
          traceId: "trace-payload",
        },
      },
    ] as const;

    for (const testCase of cases) {
      const result = dryRunQueueEnqueue(testCase.request);

      expect(result.accepted).toBe(false);
      expect(result.status).toBe("rejected");
      expect(result.diagnosticCodes).toContain(testCase.expectedCode);
      expect(result.livePublishAttempted).toBe(false);
      expect(result.liveQueuePublishingEnabled).toBe(false);
    }
  });

  it("redacts queue URLs, tokens, object keys, signed URLs, wallet addresses, provider payloads, and raw payloads", () => {
    const rawFixture = {
      bearerToken: "Bearer worker-token-456",
      idempotencyKey: "idempotency:ELF_raw_wallet",
      jobPayload: "{\"walletAddress\":\"ELF_raw_wallet\",\"taskId\":\"task_raw\"}",
      leaseToken: "lease-token-000",
      nested: {
        objectKey: "tenant/raw/export.csv",
        payloadReference: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        providerPayload: "{\"address\":\"ELF_provider_payload\",\"score\":99}",
        queueUrl: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        webhookSecret: "hook-secret-000",
      },
    };

    const redacted = redactQueueRuntimeValue(rawFixture);
    const rejected = dryRunQueueEnqueue({
      attempt: 1,
      idempotencyKey: rawFixture.idempotencyKey,
      jobId: "task-verification-worker",
      payloadReference: rawFixture.jobPayload,
      queueId: "verification-jobs",
      traceId: "trace-redaction",
    });
    const serialized = JSON.stringify({ redacted, rejected });

    expect(serialized).not.toContain("worker-token-456");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).not.toContain("task_raw");
    expect(serialized).not.toContain("lease-token-000");
    expect(serialized).not.toContain("tenant/raw/export.csv");
    expect(serialized).not.toContain("ELF_provider_payload");
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("hook-secret-000");
    expect(serialized).toContain("[redacted]");
    expect(rejected.diagnosticCodes).toEqual(
      expect.arrayContaining(["UNSAFE_IDEMPOTENCY_KEY", "UNSAFE_PAYLOAD_REFERENCE"]),
    );
  });

  it("surfaces provider adapter metadata without enabling live queue operations", () => {
    const foundation = createQueueRuntimeFoundation({
      profileId: "staging-scaffold",
      providerId: "metadata-only",
    });

    expect(foundation.queuePlans.map((plan) => plan.jobId)).toEqual(workerJobCatalog.map((job) => job.id));
    expect(foundation.queuePlans.every((plan) => plan.livePublishingEnabled === false)).toBe(true);
    expect(foundation.providerAdapter.operationCapabilities).toHaveLength(8);
    expect(foundation.providerAdapter.operationCapabilities.every((capability) => capability.liveEnabled === false)).toBe(
      true,
    );
    expect(foundation.providerAdapter.disabledLiveOperationCount).toBe(8);
    expect(foundation.providerAdapter.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.providerAdapter.liveWorkerExecutionEnabled).toBe(false);
    expect(foundation.readiness.providerRequiredConfigKeys).toEqual(
      expect.arrayContaining([
        "CAMPAIGN_OS_QUEUE_PROVIDER",
        "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
        "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
        "CAMPAIGN_OS_WORKER_QUEUE_URL",
        "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
        "CAMPAIGN_OS_WORKER_RETRY_POLICY",
        "CAMPAIGN_OS_DEGRADATION_POLICY",
        "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
        "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
        "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
      ]),
    );
  });

  it("redacts unsafe provider adapter ids and config surfaced through queue runtime", () => {
    const foundation = createQueueRuntimeFoundation({
      env: {
        CAMPAIGN_OS_QUEUE_PROVIDER: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
      },
      profileId: "production-required",
    });
    const serialized = JSON.stringify(foundation);

    expect(foundation.providerAdapter.status).toBe("blocked");
    expect(foundation.providerAdapter.providerId).toBe("blocked-provider");
    expect(foundation.providerAdapter.diagnosticCodes).toContain("UNSAFE_QUEUE_PROVIDER_CONFIG");
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret");
    expect(serialized).not.toContain("https://queue");
    expect(foundation.providerAdapter.liveQueuePublishingEnabled).toBe(false);
  });

  it("fails closed for unsupported queue runtime profiles", () => {
    const foundation = createQueueRuntimeFoundation({ profileId: "live-queue" });

    expect(foundation.profileId).toBe("production-required");
    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.diagnosticCodes[0]).toBe("UNKNOWN_QUEUE_RUNTIME_PROFILE");
    expect(JSON.stringify(foundation)).not.toContain("live-queue-secret");
  });
});
