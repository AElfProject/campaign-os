import { describe, expect, it } from "vitest";
import {
  SUPPORTED_WORKER_IDEMPOTENCY_STORE_PROFILES,
  createWorkerIdempotencyStoreFoundation,
  evaluateWorkerIdempotencyDryRun,
  redactWorkerIdempotencyStoreValue,
  workerIdempotencyOperationCapabilities,
  workerIdempotencyStoreNoLiveFlags,
  workerIdempotencyStoreProductionPreconditions,
} from "./workerIdempotencyStore";

describe("worker idempotency store foundation", () => {
  it("declares a stable foundation id and supported profiles", () => {
    const foundation = createWorkerIdempotencyStoreFoundation();

    expect(foundation.id).toBe("campaign-os-worker-idempotency-store-foundation");
    expect(SUPPORTED_WORKER_IDEMPOTENCY_STORE_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
  });

  it("keeps local review deterministic, valid, and free of live idempotency execution", () => {
    const startedAt = performance.now();
    const foundation = createWorkerIdempotencyStoreFoundation({ profileId: "local-review" });
    const evaluation = evaluateWorkerIdempotencyDryRun({
      attempt: 1,
      completionEvidenceReference: "evidence-ref:task-verification-worker",
      idempotencyKeyReference: "idempotency-key-ref:task-verification-worker",
      jobId: "task-verification-worker",
      leaseKeyReference: "lease-key-ref:task-verification-worker",
      operation: "claim",
      requestedAt: "2026-07-07T19:30:00Z",
      sideEffectBoundary: "points-ledger-and-task-completion",
      traceId: "trace-worker-idempotency-local",
      workerReference: "worker-ref:local-review",
    });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.mode).toBe("dry_run");
    expect(foundation.storeId).toBe("local-dry-run");
    expect(foundation.adapterId).toBe("local-dry-run-worker-idempotency-store-adapter");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(workerIdempotencyStoreNoLiveFlags);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.readiness).toMatchObject({
      disabledLiveOperationCount: workerIdempotencyOperationCapabilities.length,
      liveIdempotencyExecutionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      operationCount: workerIdempotencyOperationCapabilities.length,
      productionReady: false,
    });
    expect(evaluation.status).toBe("accepted_dry_run");
    expect(evaluation.liveIdempotencyOperationAttempted).toBe(false);
    expect(evaluation.liveWorkerExecutionEnabled).toBe(false);
    expect(evaluation.productionWriteAttempted).toBe(false);
  });

  it("keeps every idempotency operation metadata-only or disabled for staging", () => {
    const foundation = createWorkerIdempotencyStoreFoundation({
      profileId: "staging-scaffold",
      storeId: "metadata-only",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.mode).toBe("metadata_only");
    expect(foundation.valid).toBe(true);
    expect(foundation.operationCapabilities.map((item) => item.operation)).toEqual([
      "claim",
      "complete",
      "fail",
      "release",
      "conflict",
      "replay",
      "recover_stale",
      "metrics",
    ]);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
    expect(foundation.noLiveFlags).toEqual({
      liveAiCallsEnabled: false,
      liveAnalyticsIngestionEnabled: false,
      liveContractCallsEnabled: false,
      liveCronExecutionEnabled: false,
      liveIdempotencyExecutionEnabled: false,
      liveObjectStorageEnabled: false,
      liveProviderCallsEnabled: false,
      liveQueuePublishingEnabled: false,
      liveRewardDistributionEnabled: false,
      liveSchedulerExecutionEnabled: false,
      liveSocialCallsEnabled: false,
      liveWorkerExecutionEnabled: false,
    });
  });

  it("fails closed for production-required when idempotency preconditions are missing", () => {
    const foundation = createWorkerIdempotencyStoreFoundation({
      profileId: "production-required",
      storeId: "production-idempotency-store",
    });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(workerIdempotencyStoreProductionPreconditions.length);
    expect(foundation.diagnosticCodes).toEqual([
      "IDEMPOTENCY_STORE_MISSING",
      "IDEMPOTENCY_STORE_ENDPOINT_MISSING",
      "IDEMPOTENCY_STORE_CREDENTIALS_MISSING",
      "IDEMPOTENCY_NAMESPACE_MISSING",
      "IDEMPOTENCY_KEY_SCHEMA_VERSION_MISSING",
      "IDEMPOTENCY_RETENTION_POLICY_MISSING",
      "IDEMPOTENCY_CONFLICT_POLICY_MISSING",
      "IDEMPOTENCY_COMPLETION_POLICY_MISSING",
      "IDEMPOTENCY_CLOCK_MISSING",
      "IDEMPOTENCY_WORKER_LEASE_COORDINATION_MISSING",
      "IDEMPOTENCY_OBSERVABILITY_MISSING",
    ]);
  });

  it("can report production-required config shape without becoming production ready", () => {
    const foundation = createWorkerIdempotencyStoreFoundation({
      env: {
        CAMPAIGN_OS_CLOCK_SOURCE: "clock-ref:monotonic",
        CAMPAIGN_OS_IDEMPOTENCY_COMPLETION_POLICY: "completion:return-existing",
        CAMPAIGN_OS_IDEMPOTENCY_CONFLICT_POLICY: "conflict:manual-review",
        CAMPAIGN_OS_IDEMPOTENCY_KEY_SCHEMA_VERSION: "v1",
        CAMPAIGN_OS_IDEMPOTENCY_NAMESPACE: "campaign-os-workers",
        CAMPAIGN_OS_IDEMPOTENCY_RETENTION_DAYS: "30",
        CAMPAIGN_OS_IDEMPOTENCY_STORE: "production-idempotency-store",
        CAMPAIGN_OS_IDEMPOTENCY_STORE_CREDENTIALS: "credential-ref:idempotency",
        CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
        CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:review",
      },
      profileId: "production-required",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.profileId).toBe("production-required");
    expect(foundation.mode).toBe("production_required");
    expect(foundation.storeId).toBe("production-idempotency-store");
    expect(foundation.namespace).toBe("campaign-os-workers");
    expect(foundation.keySchemaVersion).toBe("v1");
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags.liveIdempotencyExecutionEnabled).toBe(false);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
  });

  it("accepts safe dry-run requests and echoes only safe references", () => {
    const result = evaluateWorkerIdempotencyDryRun({
      attempt: 1,
      completionEvidenceReference: "evidence-ref:task-verification-worker",
      idempotencyKeyReference: "idempotency-key-ref:task-verification-worker",
      jobId: "task-verification-worker",
      leaseKeyReference: "lease-key-ref:task-verification-worker",
      operation: "complete",
      requestedAt: "2026-07-07T19:35:00Z",
      sideEffectBoundary: "points-ledger-and-task-completion",
      traceId: "trace-worker-idempotency-complete",
      workerReference: "worker-ref:local-review",
    });

    expect(result).toMatchObject({
      accepted: true,
      diagnosticCodes: [],
      idempotencyKeyReference: "idempotency-key-ref:task-verification-worker",
      jobId: "task-verification-worker",
      liveIdempotencyOperationAttempted: false,
      liveWorkerExecutionEnabled: false,
      productionWriteAttempted: false,
      status: "accepted_dry_run",
    });
  });

  it("rejects unsafe dry-run requests without leaking raw material", () => {
    const result = evaluateWorkerIdempotencyDryRun({
      attempt: 0,
      completionEvidenceReference: "tenant/raw/evidence.json",
      idempotencyKeyReference: "campaign/wallet/ELF_secret_wallet/task.json",
      jobId: "unknown-worker-secret-token",
      leaseKeyReference: "tenant/raw/lease-lock.json",
      operation: "complete",
      requestedAt: "not-a-date",
      sideEffectBoundary: "unknown-side-effect-boundary",
      traceId: "",
      workerReference: "https://worker-user:worker-pass@worker.invalid/run?token=secret",
    });
    const serialized = JSON.stringify(result);

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.diagnosticCodes).toEqual([
      "UNKNOWN_WORKER_JOB",
      "MISSING_TRACE_ID",
      "UNSAFE_IDEMPOTENCY_KEY",
      "UNKNOWN_SIDE_EFFECT_BOUNDARY",
      "UNSAFE_WORKER_REFERENCE",
      "UNSAFE_LEASE_KEY",
      "UNSAFE_COMPLETION_EVIDENCE",
      "INVALID_ATTEMPT",
      "INVALID_IDEMPOTENCY_TIMESTAMP",
    ]);
    expect(result.liveIdempotencyOperationAttempted).toBe(false);
    expect(result.liveWorkerExecutionEnabled).toBe(false);
    expect(result.productionWriteAttempted).toBe(false);
    expect(serialized).not.toContain("unknown-worker-secret-token");
    expect(serialized).not.toContain("tenant/raw/evidence.json");
    expect(serialized).not.toContain("tenant/raw/lease-lock.json");
    expect(serialized).not.toContain("ELF_secret_wallet");
    expect(serialized).not.toContain("worker-user");
    expect(serialized).not.toContain("worker-pass");
  });

  it("requires completion evidence for complete operations", () => {
    const result = evaluateWorkerIdempotencyDryRun({
      attempt: 1,
      idempotencyKeyReference: "idempotency-key-ref:task-verification-worker",
      jobId: "task-verification-worker",
      operation: "complete",
      sideEffectBoundary: "points-ledger-and-task-completion",
      traceId: "trace-worker-idempotency-missing-evidence",
      workerReference: "worker-ref:local-review",
    });

    expect(result.accepted).toBe(false);
    expect(result.diagnosticCodes).toEqual(["MISSING_COMPLETION_EVIDENCE"]);
    expect(JSON.stringify(result)).not.toContain("idempotency-key-ref:task-verification-worker");
  });

  it("fails closed for unsupported or unsafe profiles and store ids", () => {
    const unknownProfile = createWorkerIdempotencyStoreFoundation({
      profileId: "live-idempotency-secret",
      storeId: "production-idempotency-store",
    });
    const unsupportedStore = createWorkerIdempotencyStoreFoundation({
      profileId: "local-review",
      storeId: "redis",
    });
    const unsafeStore = createWorkerIdempotencyStoreFoundation({
      profileId: "local-review",
      storeId: "https://idempotency-user:idempotency-pass@store.invalid/locks?token=secret",
    });
    const serialized = JSON.stringify({ unknownProfile, unsafeStore });

    expect(unknownProfile.profileId).toBe("production-required");
    expect(unknownProfile.status).toBe("blocked");
    expect(unknownProfile.valid).toBe(false);
    expect(unknownProfile.diagnosticCodes[0]).toBe("UNKNOWN_IDEMPOTENCY_PROFILE");
    expect(unsupportedStore.status).toBe("blocked");
    expect(unsupportedStore.diagnosticCodes).toEqual(["IDEMPOTENCY_STORE_UNSUPPORTED"]);
    expect(unsafeStore.status).toBe("blocked");
    expect(unsafeStore.storeId).toBe("blocked-idempotency-store");
    expect(unsafeStore.diagnosticCodes).toEqual(["UNSAFE_IDEMPOTENCY_CONFIG"]);
    expect(serialized).not.toContain("idempotency-user");
    expect(serialized).not.toContain("idempotency-pass");
    expect(serialized).not.toContain("secret");
  });

  it("redacts idempotency keys, payloads, credentials, object keys, signed URLs, and wallet addresses", () => {
    const rawFixture = {
      apiKey: "idempotency-api-key-123",
      bearerToken: "Bearer idempotency-token-456",
      contractPayload: "{\"walletAddress\":\"ELF_contract_wallet\",\"claim\":\"raw\"}",
      idempotencyKey: "campaign/wallet/ELF_raw_wallet/task.json",
      lockKey: "tenant/raw/idempotency-lock.json",
      nested: {
        evidencePayload: "{\"walletAddress\":\"ELF_evidence_wallet\",\"taskId\":\"task_raw\"}",
        objectKey: "tenant/raw/export.csv",
        providerPayload: "{\"walletAddress\":\"ELF_provider_wallet\",\"taskId\":\"task_raw\"}",
        queuePayload: "{\"job\":\"task-verification\",\"address\":\"ELF_payload_wallet\"}",
        rewardPayload: "{\"walletAddress\":\"ELF_reward_wallet\",\"amount\":\"100\"}",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        webhookSecret: "hook-secret-000",
        workerPayload: "{\"walletAddress\":\"ELF_worker_wallet\",\"job\":\"raw\"}",
      },
      privateKey: "-----BEGIN PRIVATE KEY-----abc-----END PRIVATE KEY-----",
      walletAddress: "ELF_raw_wallet",
    };

    const redacted = redactWorkerIdempotencyStoreValue(rawFixture);
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("idempotency-api-key-123");
    expect(serialized).not.toContain("idempotency-token-456");
    expect(serialized).not.toContain("ELF_contract_wallet");
    expect(serialized).not.toContain("tenant/raw/idempotency-lock.json");
    expect(serialized).not.toContain("ELF_evidence_wallet");
    expect(serialized).not.toContain("tenant/raw/export.csv");
    expect(serialized).not.toContain("ELF_provider_wallet");
    expect(serialized).not.toContain("ELF_payload_wallet");
    expect(serialized).not.toContain("ELF_reward_wallet");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("hook-secret-000");
    expect(serialized).not.toContain("ELF_worker_wallet");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).toContain("[redacted]");
  });
});
