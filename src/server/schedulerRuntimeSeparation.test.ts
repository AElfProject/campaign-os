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
        CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:review",
        CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
        CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
        CAMPAIGN_OS_QUEUE_PROVIDER: "production-queue-provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "queue-endpoint-ref:provider",
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
    expect(configuredProviderQueue.providerAdapter.operationCapabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ liveEnabled: false, operation: "publish" }),
        expect.objectContaining({ liveEnabled: false, operation: "ack" }),
        expect.objectContaining({ liveEnabled: false, operation: "nack" }),
        expect.objectContaining({ liveEnabled: false, operation: "dead_letter" }),
      ]),
    );
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
