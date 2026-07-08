import { describe, expect, it } from "vitest";
import {
  observabilityExporterOperationCapabilities,
  observabilityExporterProductionPreconditions,
} from "./observabilityExporter";
import {
  SUPPORTED_WORKER_IDEMPOTENCY_STORE_PROFILES,
  createWorkerIdempotencyStoreFoundation,
  evaluateWorkerIdempotencyDryRun,
  redactWorkerIdempotencyStoreValue,
  workerIdempotencyOperationCapabilities,
  workerIdempotencyStoreNoLiveFlags,
  workerIdempotencyStoreProductionPreconditions,
} from "./workerIdempotencyStore";
import { createQueueProviderPackageBinding } from "./queueProviderPackageBinding";

const queueProviderSdkBindingConfigKeys = [
  "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE",
  "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING",
  "CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER",
  "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT",
  "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS",
  "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT",
];

const queueProviderSdkBindingReadyEnv = {
  CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "Bearer queue-secret-token",
  CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "production-provider-driver",
  CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
  CAMPAIGN_OS_QUEUE_PROVIDER_SDK_BINDING: "production-provider-sdk-binding",
  CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE: "package-ref:@provider/queue-sdk",
} satisfies Record<string, unknown>;

const queueProviderPackageBindingReadyEnv = {
  CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:queue-package",
  CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
  CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:queue-package",
  CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:queue-package",
  CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-package",
  CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-package",
  CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
  CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
  CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:queue-package",
  CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:queue-package",
  CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
} satisfies Record<string, unknown>;

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
      observabilityExporterBlockerCount: 0,
      observabilityExporterDiagnosticCodes: [],
      observabilityExporterId: "local-dry-run",
      observabilityExporterLiveTelemetryExportEnabled: false,
      observabilityExporterMode: "dry_run",
      observabilityExporterSinkId: "local-metrics-sink",
      observabilityExporterStatus: "local_ready",
      operationCount: workerIdempotencyOperationCapabilities.length,
      productionReady: false,
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

  it("treats queue provider SDK binding readiness as idempotency handoff metadata only", () => {
    const foundation = createWorkerIdempotencyStoreFoundation({
      env: queueProviderSdkBindingReadyEnv,
      profileId: "local-review",
    });
    const evaluation = evaluateWorkerIdempotencyDryRun({
      attempt: 1,
      idempotencyKeyReference: "idempotency-key-ref:task-verification-worker",
      jobId: "task-verification-worker",
      operation: "claim",
      sideEffectBoundary: "points-ledger-and-task-completion",
      traceId: "trace-worker-idempotency-sdk-binding-metadata",
      workerReference: "worker-ref:local-review",
    });
    const serialized = JSON.stringify(foundation);

    expect(foundation.readiness.queueProviderSdkBindingHandoff).toEqual({
      activationGateSatisfied: true,
      configuredConfigKeys: queueProviderSdkBindingConfigKeys,
      handoffMode: "metadata_only",
      liveIdempotencyExecutionEnabled: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      requiredConfigKeys: queueProviderSdkBindingConfigKeys,
      source: "queue-provider-sdk-binding-readiness",
      status: "configured_metadata_only",
    });
    expect(foundation.noLiveFlags).toEqual(workerIdempotencyStoreNoLiveFlags);
    expect(foundation.operationCapabilities.every((capability) => capability.liveEnabled === false)).toBe(true);
    expect(evaluation).toMatchObject({
      liveIdempotencyOperationAttempted: false,
      liveWorkerExecutionEnabled: false,
      productionWriteAttempted: false,
      status: "accepted_dry_run",
    });
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret");
    expect(serialized).not.toContain("queue-secret-token");
    expect(serialized).not.toContain("@provider/queue-sdk");
  });

  it("does not treat queue provider package binding readiness as idempotency readiness", () => {
    const packageBinding = createQueueProviderPackageBinding({
      env: queueProviderPackageBindingReadyEnv,
      profileId: "production-required",
    });
    const idempotencyStore = createWorkerIdempotencyStoreFoundation({
      env: queueProviderPackageBindingReadyEnv,
      profileId: "production-required",
    });
    const serialized = JSON.stringify({ idempotencyStore, packageBinding });

    expect(packageBinding.valid).toBe(true);
    expect(packageBinding.productionReady).toBe(false);
    expect(packageBinding.noLiveFlags).toMatchObject({
      liveBrokerConnectionAttempted: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      sdkClientConstructed: false,
    });
    expect(idempotencyStore.status).toBe("blocked");
    expect(idempotencyStore.valid).toBe(false);
    expect(idempotencyStore.productionReady).toBe(false);
    expect(idempotencyStore.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "IDEMPOTENCY_STORE_MISSING",
        "IDEMPOTENCY_STORE_CREDENTIALS_MISSING",
        "IDEMPOTENCY_NAMESPACE_MISSING",
        "IDEMPOTENCY_KEY_SCHEMA_VERSION_MISSING",
      ]),
    );
    expect(idempotencyStore.readiness.liveIdempotencyExecutionEnabled).toBe(false);
    expect(idempotencyStore.readiness.liveWorkerExecutionEnabled).toBe(false);
    expect(idempotencyStore.noLiveFlags).toEqual(workerIdempotencyStoreNoLiveFlags);
    expect(serialized).not.toContain("redis://");
    expect(serialized).not.toContain("redis-pass");
    expect(serialized).not.toContain("redis-secret");
    expect(serialized).not.toContain("queue-package-secret-token");
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
    expect(foundation.observabilityExporter.requiredConfigKeys).toEqual(
      expect.arrayContaining(observabilityExporterProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
    );
    expect(foundation.observabilityExporter.productionReady).toBe(false);
    expect(foundation.observabilityExporter.liveTelemetryExportEnabled).toBe(false);
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

  it("rejects a valid but job-mismatched idempotency side-effect boundary", () => {
    const result = evaluateWorkerIdempotencyDryRun({
      attempt: 1,
      completionEvidenceReference: "evidence-ref:task-verification-worker",
      idempotencyKeyReference: "idempotency-key-ref:task-verification-worker",
      jobId: "task-verification-worker",
      operation: "claim",
      sideEffectBoundary: "reward-distribution",
      traceId: "trace-worker-idempotency-boundary-mismatch",
      workerReference: "worker-ref:local-review",
    });

    expect(result.accepted).toBe(false);
    expect(result.diagnosticCodes).toEqual(["UNKNOWN_SIDE_EFFECT_BOUNDARY"]);
  });

  it("redacts unsafe namespace and schema env values from readiness output", () => {
    const foundation = createWorkerIdempotencyStoreFoundation({
      env: {
        CAMPAIGN_OS_IDEMPOTENCY_KEY_SCHEMA_VERSION: "https://schema-user:schema-pass@schema.invalid?v=secret",
        CAMPAIGN_OS_IDEMPOTENCY_NAMESPACE: "https://namespace-user:namespace-pass@namespace.invalid?token=secret",
      },
      profileId: "local-review",
    });
    const serialized = JSON.stringify(foundation);

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.namespace).toBe("blocked-idempotency-namespace");
    expect(foundation.keySchemaVersion).toBe("blocked-idempotency-schema-version");
    expect(foundation.diagnosticCodes).toEqual([
      "UNSAFE_IDEMPOTENCY_CONFIG",
      "UNSAFE_IDEMPOTENCY_CONFIG",
    ]);
    expect(serialized).not.toContain("namespace-user");
    expect(serialized).not.toContain("namespace-pass");
    expect(serialized).not.toContain("schema-user");
    expect(serialized).not.toContain("schema-pass");
    expect(serialized).not.toContain("secret");
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
