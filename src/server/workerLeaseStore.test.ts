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
  CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "circuit-closed",
  CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "500",
  CAMPAIGN_OS_REDIS_CREDENTIALS: "redis-auth-ref:queue-package",
  CAMPAIGN_OS_REDIS_DATABASE: "redis-db-0",
  CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "retry-exponential",
  CAMPAIGN_OS_REDIS_TLS_POLICY: "tls-required",
  CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
  CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:queue-package",
  CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:queue-package",
  CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
} satisfies Record<string, unknown>;

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

  it("treats queue provider SDK binding readiness as lease handoff metadata only", () => {
    const foundation = createWorkerLeaseStoreFoundation({
      env: queueProviderSdkBindingReadyEnv,
      profileId: "local-review",
    });
    const evaluation = evaluateWorkerLeaseDryRun({
      fencingTokenReference: "fence-ref:task-verification-worker",
      heartbeatIntervalSeconds: 30,
      jobId: "task-verification-worker",
      leaseKeyReference: "lease-key-ref:task-verification-worker",
      operation: "claim",
      traceId: "trace-worker-lease-sdk-binding-metadata",
      ttlSeconds: 120,
      workerReference: "worker-ref:local-review",
    });
    const serialized = JSON.stringify(foundation);

    expect(foundation.readiness.queueProviderSdkBindingHandoff).toEqual({
      activationGateSatisfied: true,
      configuredConfigKeys: queueProviderSdkBindingConfigKeys,
      handoffMode: "metadata_only",
      liveLeaseClaimingEnabled: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      requiredConfigKeys: queueProviderSdkBindingConfigKeys,
      source: "queue-provider-sdk-binding-readiness",
      status: "configured_metadata_only",
    });
    expect(foundation.noLiveFlags).toEqual(workerLeaseStoreNoLiveFlags);
    expect(foundation.operationCapabilities.every((capability) => capability.liveEnabled === false)).toBe(true);
    expect(evaluation).toMatchObject({
      liveLeaseOperationAttempted: false,
      liveWorkerExecutionEnabled: false,
      status: "accepted_dry_run",
    });
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret");
    expect(serialized).not.toContain("queue-secret-token");
    expect(serialized).not.toContain("@provider/queue-sdk");
  });

  it("does not treat queue provider package binding readiness as lease store readiness", () => {
    const packageBinding = createQueueProviderPackageBinding({
      env: queueProviderPackageBindingReadyEnv,
      profileId: "production-required",
    });
    const leaseStore = createWorkerLeaseStoreFoundation({
      env: queueProviderPackageBindingReadyEnv,
      profileId: "production-required",
    });
    const serialized = JSON.stringify({ leaseStore, packageBinding });

    expect(packageBinding).toMatchObject({
      brokerConnectionPosture: "reference_only",
      liveBrokerConnectionAttempted: false,
      liveBrokerHealthCheckAttempted: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
      queueClientConstructed: false,
      queueEventsConstructed: false,
      sdkClientConstructed: false,
      status: "scaffolded",
      valid: true,
      workerConstructed: false,
    });
    expect(packageBinding.brokerConnection).toMatchObject({
      healthCheckMode: "metadata_only",
      liveBrokerHealthCheckAttempted: false,
      queueClientConstructed: false,
      queueEventsConstructed: false,
      status: "scaffolded",
      workerConstructed: false,
    });
    expect(packageBinding.definition.packageName).toBe("bullmq");
    expect(packageBinding.readiness.packageName).toBe("bullmq");
    expect(leaseStore.status).toBe("blocked");
    expect(leaseStore.valid).toBe(false);
    expect(leaseStore.productionReady).toBe(false);
    expect(leaseStore.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "WORKER_LEASE_STORE_MISSING",
        "WORKER_LEASE_CREDENTIALS_MISSING",
        "WORKER_LEASE_CLOCK_MISSING",
      ]),
    );
    expect(leaseStore.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(leaseStore.readiness.liveWorkerExecutionEnabled).toBe(false);
    expect(leaseStore.noLiveFlags).toEqual(workerLeaseStoreNoLiveFlags);
    expect(serialized).not.toContain("redis://");
    expect(serialized).not.toContain("redis-pass");
    expect(serialized).not.toContain("redis-secret");
    expect(serialized).not.toContain("queue-package-secret-token");
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
