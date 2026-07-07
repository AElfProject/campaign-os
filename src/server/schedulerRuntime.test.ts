import { describe, expect, it } from "vitest";
import {
  SUPPORTED_SCHEDULER_RUNTIME_PROFILES,
  createSchedulerRuntimeFoundation,
  dryRunSchedulerTrigger,
  redactSchedulerRuntimeValue,
  schedulerRuntimeNoLiveFlags,
  schedulerRuntimeProductionPreconditions,
  schedulerRuntimeRegistrations,
} from "./schedulerRuntime";
import {
  workerJobCatalog,
  workerSchedulerPolicies,
} from "./workerSchedulerRuntime";

describe("scheduler runtime foundation", () => {
  it("declares a stable foundation id and supported runtime profiles", () => {
    const foundation = createSchedulerRuntimeFoundation();

    expect(foundation.id).toBe("campaign-os-scheduler-runtime-foundation");
    expect(SUPPORTED_SCHEDULER_RUNTIME_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
  });

  it("derives one deterministic schedule registration for every worker scheduler policy", () => {
    expect(schedulerRuntimeRegistrations.map((registration) => registration.scheduleId)).toEqual(
      workerSchedulerPolicies.map((policy) => policy.id),
    );
    expect(schedulerRuntimeRegistrations.map((registration) => registration.jobId)).toEqual(
      workerSchedulerPolicies.map((policy) => policy.jobId),
    );
    expect(schedulerRuntimeRegistrations).toHaveLength(9);
    expect(new Set(schedulerRuntimeRegistrations.map((registration) => registration.scheduleId)).size).toBe(9);

    for (const registration of schedulerRuntimeRegistrations) {
      const policy = workerSchedulerPolicies.find((item) => item.id === registration.scheduleId);
      const job = workerJobCatalog.find((item) => item.id === registration.jobId);

      expect(policy).toBeDefined();
      expect(job).toBeDefined();
      expect(registration).toMatchObject({
        cadence: policy?.cadence,
        concurrencyLimit: policy?.concurrencyLimit,
        deadlineSeconds: policy?.deadlineSeconds,
        idempotencyPolicyId: policy?.idempotencyPolicyId,
        retryPolicyId: policy?.retryPolicyId,
        sideEffectBoundary: job?.sideEffectBoundary,
        triggerSource: policy?.triggerSource,
      });
      expect(registration.queueHandoff.queueRuntimeId).toBe("campaign-os-queue-runtime-foundation");
      expect(registration.liveCronExecutionEnabled).toBe(false);
      expect(registration.liveQueuePublishingEnabled).toBe(false);
      expect(registration.liveSchedulerExecutionEnabled).toBe(false);
    }
  });

  it("keeps local review deterministic, valid, and free of live execution", () => {
    const startedAt = performance.now();
    const foundation = createSchedulerRuntimeFoundation({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(schedulerRuntimeNoLiveFlags);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.readiness).toMatchObject({
      dryRunTriggerEnabled: true,
      liveCronExecutionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
      productionReady: false,
      registrationCount: 9,
    });
  });

  it("keeps every scheduler, cron, queue, worker, and live integration flag disabled", () => {
    expect(schedulerRuntimeNoLiveFlags).toEqual({
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

    const foundation = createSchedulerRuntimeFoundation({ profileId: "staging-scaffold" });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(schedulerRuntimeNoLiveFlags);
  });

  it("fails closed for production-required when scheduler preconditions are missing", () => {
    const foundation = createSchedulerRuntimeFoundation({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(schedulerRuntimeProductionPreconditions.length);
    expect(foundation.diagnosticCodes).toEqual([
      "SCHEDULER_PROVIDER_MISSING",
      "SCHEDULER_ENDPOINT_MISSING",
      "SCHEDULER_CLOCK_LEASE_MISSING",
      "SCHEDULER_IDEMPOTENCY_STORE_MISSING",
      "SCHEDULER_QUEUE_HANDOFF_MISSING",
      "SCHEDULER_OBSERVABILITY_MISSING",
      "SCHEDULER_OPERATOR_AUTHORIZATION_MISSING",
      "SCHEDULER_DEAD_LETTER_MISSING",
    ]);
  });

  it("covers every Campaign OS backend schedule family", () => {
    const families = new Set(schedulerRuntimeRegistrations.map((registration) => registration.jobFamily));

    expect(families).toEqual(
      new Set([
        "task_verification",
        "campaign_lifecycle",
        "eligibility_refresh",
        "export_preparation",
        "analytics_ingestion_handoff",
        "ai_ops_report",
        "stale_review_cleanup",
        "contract_sync_handoff",
        "reward_distribution_handoff",
      ]),
    );
  });

  it("accepts a safe known dry-run trigger without live execution", () => {
    const result = dryRunSchedulerTrigger({
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-scheduler-runtime-test",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });

    expect(result).toMatchObject({
      accepted: true,
      degradedOutcome: "pending",
      diagnosticCodes: [],
      jobId: "task-verification-worker",
      liveCronExecutionEnabled: false,
      liveExecutionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveSchedulerExecutionEnabled: false,
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      status: "accepted_dry_run",
      traceId: "trace-scheduler-runtime-test",
      triggerSource: "api_request",
    });
  });

  it("rejects unsafe, unknown, mismatched, and invalid dry-run trigger requests", () => {
    const validRequest = {
      idempotencyKey: "idempotency:task-verification-on-request:campaign-1",
      jobId: "task-verification-worker",
      queueHandoffReference: "queue-handoff:task-verification-worker-queue-plan",
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-scheduler-runtime-test",
      triggerSource: "api_request" as const,
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    };
    const cases = [
      {
        expectedCode: "UNKNOWN_SCHEDULE_ID",
        request: { ...validRequest, scheduleId: "unknown-schedule" },
      },
      {
        expectedCode: "MISMATCHED_SCHEDULE_JOB",
        request: { ...validRequest, jobId: "campaign-lifecycle-worker" },
      },
      {
        expectedCode: "MISMATCHED_TRIGGER_SOURCE",
        request: { ...validRequest, triggerSource: "recurring" as const },
      },
      {
        expectedCode: "MISSING_TRACE_ID",
        request: { ...validRequest, traceId: " " },
      },
      {
        expectedCode: "INVALID_TIME_WINDOW",
        request: { ...validRequest, windowEnd: "2026-07-07T13:00:00Z" },
      },
      {
        expectedCode: "UNSAFE_IDEMPOTENCY_KEY",
        request: { ...validRequest, idempotencyKey: "idempotency:ELF_raw_wallet" },
      },
      {
        expectedCode: "UNSAFE_QUEUE_HANDOFF_REFERENCE",
        request: {
          ...validRequest,
          queueHandoffReference: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
        },
      },
      {
        expectedCode: "UNSAFE_OPERATOR_OVERRIDE_REASON",
        request: { ...validRequest, operatorOverrideReason: "Bearer scheduler-token-123" },
      },
    ] as const;

    for (const testCase of cases) {
      const result = dryRunSchedulerTrigger(testCase.request);

      expect(result.accepted).toBe(false);
      expect(result.status).toBe("rejected");
      expect(result.diagnosticCodes).toContain(testCase.expectedCode);
      expect(result.liveCronExecutionEnabled).toBe(false);
      expect(result.liveExecutionAttempted).toBe(false);
      expect(result.liveQueuePublishingEnabled).toBe(false);
      expect(result.liveSchedulerExecutionEnabled).toBe(false);
    }
  });

  it("redacts scheduler endpoints, tokens, object keys, signed URLs, wallet addresses, provider payloads, and raw trigger payloads", () => {
    const rawFixture = {
      bearerToken: "Bearer scheduler-token-456",
      idempotencyKey: "idempotency:ELF_raw_wallet",
      leaseToken: "lease-token-000",
      nested: {
        objectKey: "tenant/raw/export.csv",
        providerPayload: "{\"address\":\"ELF_provider_payload\",\"score\":99}",
        queueHandoffReference: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
        schedulerEndpoint: "https://scheduler-user:scheduler-pass@scheduler.invalid/hook?token=scheduler-secret",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        webhookSecret: "hook-secret-000",
      },
      triggerPayload: "{\"walletAddress\":\"ELF_raw_wallet\",\"taskId\":\"task_raw\"}",
    };

    const redacted = redactSchedulerRuntimeValue(rawFixture);
    const rejected = dryRunSchedulerTrigger({
      idempotencyKey: rawFixture.idempotencyKey,
      jobId: "task-verification-worker",
      operatorOverrideReason: rawFixture.bearerToken,
      queueHandoffReference: rawFixture.nested.queueHandoffReference,
      scheduleId: "task-verification-on-request",
      scheduledFor: "2026-07-07T13:30:00Z",
      traceId: "trace-redaction",
      triggerSource: "api_request",
      windowEnd: "2026-07-07T13:35:00Z",
      windowStart: "2026-07-07T13:25:00Z",
    });
    const serialized = JSON.stringify({ redacted, rejected });

    expect(serialized).not.toContain("scheduler-token-456");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).not.toContain("lease-token-000");
    expect(serialized).not.toContain("tenant/raw/export.csv");
    expect(serialized).not.toContain("ELF_provider_payload");
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("scheduler-user");
    expect(serialized).not.toContain("scheduler-pass");
    expect(serialized).not.toContain("queue-secret");
    expect(serialized).not.toContain("scheduler-secret");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("hook-secret-000");
    expect(serialized).not.toContain("task_raw");
    expect(serialized).toContain("[redacted]");
    expect(rejected.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "UNSAFE_IDEMPOTENCY_KEY",
        "UNSAFE_QUEUE_HANDOFF_REFERENCE",
        "UNSAFE_OPERATOR_OVERRIDE_REASON",
      ]),
    );
  });

  it("fails closed for unsupported scheduler runtime profiles", () => {
    const foundation = createSchedulerRuntimeFoundation({
      profileId: "https://scheduler-user:scheduler-pass@scheduler.invalid/hook?token=live-scheduler-secret",
    });
    const serialized = JSON.stringify(foundation);

    expect(foundation.profileId).toBe("production-required");
    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.diagnosticCodes[0]).toBe("UNKNOWN_SCHEDULER_RUNTIME_PROFILE");
    expect(serialized).not.toContain("scheduler-user");
    expect(serialized).not.toContain("scheduler-pass");
    expect(serialized).not.toContain("live-scheduler-secret");
  });
});
