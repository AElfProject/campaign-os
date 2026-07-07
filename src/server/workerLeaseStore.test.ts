import { describe, expect, it } from "vitest";
import {
  observabilityExporterOperationCapabilities,
  observabilityExporterProductionPreconditions,
} from "./observabilityExporter";
import {
  workerIdempotencyOperationCapabilities,
  workerIdempotencyStoreProductionPreconditions,
} from "./workerIdempotencyStore";
import {
  SUPPORTED_WORKER_LEASE_STORE_PROFILES,
  createWorkerLeaseStoreFoundation,
  evaluateWorkerLeaseDryRun,
  redactWorkerLeaseStoreValue,
  workerLeaseOperationCapabilities,
  workerLeaseStoreNoLiveFlags,
  workerLeaseStoreProductionPreconditions,
} from "./workerLeaseStore";

describe("worker lease store foundation", () => {
  it("declares a stable foundation id and supported profiles", () => {
    const foundation = createWorkerLeaseStoreFoundation();

    expect(foundation.id).toBe("campaign-os-worker-lease-store-foundation");
    expect(SUPPORTED_WORKER_LEASE_STORE_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
  });

  it("keeps local review deterministic, valid, and free of live lease execution", () => {
    const startedAt = performance.now();
    const foundation = createWorkerLeaseStoreFoundation({ profileId: "local-review" });
    const evaluation = evaluateWorkerLeaseDryRun({
      fencingTokenReference: "fence-ref:task-verification-worker",
      heartbeatIntervalSeconds: 30,
      jobId: "task-verification-worker",
      leaseKeyReference: "lease-key-ref:task-verification-worker",
      operation: "claim",
      requestedAt: "2026-07-07T17:45:00Z",
      traceId: "trace-worker-lease-local",
      ttlSeconds: 120,
      workerReference: "worker-ref:local-review",
    });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.mode).toBe("dry_run");
    expect(foundation.storeId).toBe("local-dry-run");
    expect(foundation.adapterId).toBe("local-dry-run-worker-lease-store-adapter");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(workerLeaseStoreNoLiveFlags);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.readiness).toMatchObject({
      disabledLiveOperationCount: workerLeaseOperationCapabilities.length,
      heartbeatIntervalSeconds: 30,
      idempotencyStoreBlockerCount: 0,
      idempotencyStoreDiagnosticCodes: [],
      idempotencyStoreId: "local-dry-run",
      idempotencyStoreLiveIdempotencyExecutionEnabled: false,
      idempotencyStoreMode: "dry_run",
      idempotencyStoreStatus: "local_ready",
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      observabilityExporterBlockerCount: 0,
      observabilityExporterDiagnosticCodes: [],
      observabilityExporterId: "local-dry-run",
      observabilityExporterLiveTelemetryExportEnabled: false,
      observabilityExporterMode: "dry_run",
      observabilityExporterSinkId: "local-metrics-sink",
      observabilityExporterStatus: "local_ready",
      operationCount: workerLeaseOperationCapabilities.length,
      productionReady: false,
      ttlSeconds: 120,
    });
    expect(foundation.observabilityExporter).toMatchObject({
      disabledLiveOperationCount: observabilityExporterOperationCapabilities.length,
      exporterId: "local-dry-run",
      liveMetricsExportEnabled: false,
      liveTelemetryExportEnabled: false,
      liveTraceExportEnabled: false,
      metricNamespace: "campaign-os-runtime",
      operationCount: observabilityExporterOperationCapabilities.length,
      productionReady: false,
      sinkId: "local-metrics-sink",
      status: "local_ready",
      valid: true,
    });
    expect(evaluation.status).toBe("accepted_dry_run");
    expect(evaluation.liveLeaseOperationAttempted).toBe(false);
    expect(evaluation.liveWorkerExecutionEnabled).toBe(false);
  });

  it("references idempotency coordination without implying durable live idempotency", () => {
    const foundation = createWorkerLeaseStoreFoundation({ profileId: "local-review" });

    expect(foundation.idempotencyStore).toMatchObject({
      adapterId: "local-dry-run-worker-idempotency-store-adapter",
      blockerCount: 0,
      diagnosticCodes: [],
      disabledLiveOperationCount: workerIdempotencyOperationCapabilities.length,
      liveIdempotencyExecutionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      mode: "dry_run",
      operationCount: workerIdempotencyOperationCapabilities.length,
      productionReady: false,
      requiredConfigKeys: expect.arrayContaining([
        "CAMPAIGN_OS_IDEMPOTENCY_STORE",
        "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
        "CAMPAIGN_OS_IDEMPOTENCY_STORE_CREDENTIALS",
      ]),
      status: "local_ready",
      storeId: "local-dry-run",
      valid: true,
    });
    expect(foundation.idempotencyStore.operationCapabilities.every((capability) => capability.liveEnabled === false)).toBe(
      true,
    );
    expect(foundation.idempotencyStore.requiredConfigKeys).toHaveLength(
      new Set(workerIdempotencyStoreProductionPreconditions.flatMap((item) => item.requiredConfigKeys)).size,
    );
    expect(foundation.readiness.idempotencyStoreRequiredConfigKeys).toEqual(
      foundation.idempotencyStore.requiredConfigKeys,
    );
    expect(foundation.readiness.idempotencyStoreLiveIdempotencyExecutionEnabled).toBe(false);
    expect(foundation.readiness.liveWorkerExecutionEnabled).toBe(false);
  });

  it("keeps every lease operation metadata-only or disabled for staging", () => {
    const foundation = createWorkerLeaseStoreFoundation({
      profileId: "staging-scaffold",
      storeId: "metadata-only",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.mode).toBe("metadata_only");
    expect(foundation.valid).toBe(true);
    expect(foundation.operationCapabilities.map((item) => item.operation)).toEqual([
      "claim",
      "heartbeat",
      "release",
      "expire",
      "recover_stale",
      "reject_conflict",
      "fence",
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

  it("fails closed for production-required when lease preconditions are missing", () => {
    const foundation = createWorkerLeaseStoreFoundation({
      profileId: "production-required",
      storeId: "production-lease-store",
    });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(workerLeaseStoreProductionPreconditions.length);
    expect(foundation.diagnosticCodes).toEqual([
      "WORKER_LEASE_STORE_MISSING",
      "WORKER_LEASE_ENDPOINT_MISSING",
      "WORKER_LEASE_CREDENTIALS_MISSING",
      "WORKER_LEASE_CLOCK_MISSING",
      "WORKER_LEASE_HEARTBEAT_POLICY_MISSING",
      "WORKER_LEASE_TTL_POLICY_MISSING",
      "WORKER_LEASE_RELEASE_POLICY_MISSING",
      "WORKER_LEASE_STALE_RECOVERY_MISSING",
      "WORKER_LEASE_FENCING_POLICY_MISSING",
      "WORKER_LEASE_IDEMPOTENCY_COORDINATION_MISSING",
      "WORKER_LEASE_OBSERVABILITY_MISSING",
    ]);
  });

  it("can report production-required config shape without becoming production ready", () => {
    const foundation = createWorkerLeaseStoreFoundation({
      env: {
        CAMPAIGN_OS_CLOCK_SOURCE: "clock-ref:monotonic",
        CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
        CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS: "credential-ref:lease",
        CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY: "fencing:token-ref",
        CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS: "30",
        CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY: "release:explicit",
        CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY: "recover:manual-review",
        CAMPAIGN_OS_WORKER_LEASE_STORE: "production-lease-store",
        CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:review",
        CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS: "120",
      },
      profileId: "production-required",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.profileId).toBe("production-required");
    expect(foundation.mode).toBe("production_required");
    expect(foundation.storeId).toBe("production-lease-store");
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags.liveWorkerExecutionEnabled).toBe(false);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
    expect(foundation.observabilityExporter.requiredConfigKeys).toEqual(
      expect.arrayContaining(observabilityExporterProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
    );
    expect(foundation.observabilityExporter.productionReady).toBe(false);
    expect(foundation.observabilityExporter.liveTelemetryExportEnabled).toBe(false);
  });

  it("rejects unsafe dry-run lease requests without leaking raw material", () => {
    const result = evaluateWorkerLeaseDryRun({
      fencingTokenReference: "lease-token-secret-789",
      heartbeatIntervalSeconds: 200,
      jobId: "unknown-worker-secret-token",
      leaseKeyReference: "tenant/raw/lease-lock.json",
      operation: "claim",
      requestedAt: "not-a-date",
      traceId: "",
      ttlSeconds: 30,
      workerReference: "https://worker-user:worker-pass@worker.invalid/run?token=secret",
    });
    const serialized = JSON.stringify(result);

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.diagnosticCodes).toEqual([
      "UNKNOWN_WORKER_JOB",
      "MISSING_TRACE_ID",
      "UNSAFE_WORKER_REFERENCE",
      "UNSAFE_LEASE_KEY",
      "UNSAFE_FENCING_TOKEN",
      "INVALID_LEASE_TIMING",
    ]);
    expect(result.liveLeaseOperationAttempted).toBe(false);
    expect(result.liveWorkerExecutionEnabled).toBe(false);
    expect(serialized).not.toContain("unknown-worker-secret-token");
    expect(serialized).not.toContain("tenant/raw/lease-lock.json");
    expect(serialized).not.toContain("lease-token-secret-789");
    expect(serialized).not.toContain("worker-user");
    expect(serialized).not.toContain("worker-pass");
  });

  it("fails closed for unsupported or unsafe profiles and store ids", () => {
    const unknownProfile = createWorkerLeaseStoreFoundation({
      profileId: "live-lease-secret",
      storeId: "production-lease-store",
    });
    const unsupportedStore = createWorkerLeaseStoreFoundation({
      profileId: "local-review",
      storeId: "redis",
    });
    const unsafeStore = createWorkerLeaseStoreFoundation({
      profileId: "local-review",
      storeId: "https://lease-user:lease-pass@lease.invalid/locks?token=lease-secret",
    });
    const serialized = JSON.stringify({ unknownProfile, unsafeStore });

    expect(unknownProfile.profileId).toBe("production-required");
    expect(unknownProfile.status).toBe("blocked");
    expect(unknownProfile.valid).toBe(false);
    expect(unknownProfile.diagnosticCodes[0]).toBe("UNKNOWN_WORKER_LEASE_PROFILE");
    expect(unsupportedStore.status).toBe("blocked");
    expect(unsupportedStore.diagnosticCodes).toEqual(["WORKER_LEASE_STORE_UNSUPPORTED"]);
    expect(unsafeStore.status).toBe("blocked");
    expect(unsafeStore.storeId).toBe("blocked-lease-store");
    expect(unsafeStore.diagnosticCodes).toEqual(["UNSAFE_WORKER_LEASE_CONFIG"]);
    expect(serialized).not.toContain("lease-user");
    expect(serialized).not.toContain("lease-pass");
    expect(serialized).not.toContain("lease-secret");
  });

  it("redacts lease tokens, lock keys, credentials, payloads, object keys, signed URLs, and wallet addresses", () => {
    const rawFixture = {
      apiKey: "lease-api-key-123",
      bearerToken: "Bearer worker-token-456",
      leaseKey: "tenant/raw/lease-lock.json",
      leaseToken: "lease-token-000",
      nested: {
        objectKey: "tenant/raw/export.csv",
        providerPayload: "{\"walletAddress\":\"ELF_provider_wallet\",\"taskId\":\"task_raw\"}",
        queuePayload: "{\"job\":\"task-verification\",\"address\":\"ELF_payload_wallet\"}",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        webhookSecret: "hook-secret-000",
        workerPayload: "{\"walletAddress\":\"ELF_worker_wallet\",\"job\":\"raw\"}",
      },
      walletAddress: "ELF_raw_wallet",
    };

    const redacted = redactWorkerLeaseStoreValue(rawFixture);
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("lease-api-key-123");
    expect(serialized).not.toContain("worker-token-456");
    expect(serialized).not.toContain("tenant/raw/lease-lock.json");
    expect(serialized).not.toContain("lease-token-000");
    expect(serialized).not.toContain("tenant/raw/export.csv");
    expect(serialized).not.toContain("ELF_provider_wallet");
    expect(serialized).not.toContain("task_raw");
    expect(serialized).not.toContain("ELF_payload_wallet");
    expect(serialized).not.toContain("ELF_worker_wallet");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("hook-secret-000");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).toContain("[redacted]");
  });
});
