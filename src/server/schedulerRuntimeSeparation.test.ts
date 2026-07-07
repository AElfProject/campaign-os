import { describe, expect, it, vi } from "vitest";
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

  it("does not satisfy wallet auth, provider readiness, verification completion, or manual review", () => {
    const serialized = serializedSchedulerOutput();
    const auth = createAuthSessionReadinessReport();
    const provider = createProviderIndexerFoundation();
    const verification = createVerificationSourceHandoff();

    expect(auth.proofBoundary.liveVerificationExecuted).toBe(false);
    expect(auth.agentCredentialBoundary.agentSkillCanSubstituteUserWallet).toBe(false);
    expect(provider.productionReady).toBe(false);
    expect(provider.noLiveFlags.liveProviderCallsEnabled).toBe(false);
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
