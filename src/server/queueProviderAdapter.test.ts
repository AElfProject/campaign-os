import { describe, expect, it } from "vitest";
import {
  SUPPORTED_QUEUE_PROVIDER_ADAPTER_PROFILES,
  createQueueProviderAdapterFoundation,
  queueProviderAdapterNoLiveFlags,
  queueProviderAdapterProductionPreconditions,
  queueProviderOperationCapabilities,
  redactQueueProviderAdapterValue,
} from "./queueProviderAdapter";
import {
  observabilityExporterOperationCapabilities,
  observabilityExporterProductionPreconditions,
} from "./observabilityExporter";
import {
  createWorkerLeaseStoreFoundation,
  workerLeaseOperationCapabilities,
  workerLeaseStoreProductionPreconditions,
} from "./workerLeaseStore";
import {
  queueProviderSdkBindingOperationCapabilities,
  queueProviderSdkBindingProductionPreconditions,
} from "./queueProviderSdkBinding";
import { queueProviderPackageProductionPreconditions } from "./queueProviderPackageBinding";

describe("queue provider adapter foundation", () => {
  it("declares a stable foundation id and supported profiles", () => {
    const foundation = createQueueProviderAdapterFoundation();

    expect(foundation.id).toBe("campaign-os-queue-provider-adapter-foundation");
    expect(SUPPORTED_QUEUE_PROVIDER_ADAPTER_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
  });

  it("keeps local review deterministic, valid, and free of live provider execution", () => {
    const startedAt = performance.now();
    const foundation = createQueueProviderAdapterFoundation({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.mode).toBe("dry_run");
    expect(foundation.providerId).toBe("local-dry-run");
    expect(foundation.adapterId).toBe("local-dry-run-queue-provider-adapter");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(queueProviderAdapterNoLiveFlags);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.readiness).toMatchObject({
      disabledLiveOperationCount: queueProviderOperationCapabilities.length,
      driverActivationGateSatisfied: false,
      driverBlockerCount: 0,
      driverDiagnosticCodes: [],
      driverId: "local-fake-queue-provider-driver",
      driverLiveQueuePublishingEnabled: false,
      driverLiveWorkerExecutionEnabled: false,
      driverMode: "dry_run",
      driverProviderId: "local-fake",
      driverSdkBindingBlockerCount: 0,
      driverSdkBindingDisabledLiveOperationCount: queueProviderSdkBindingOperationCapabilities.length,
      driverSdkBindingId: "local-stub-queue-provider-sdk-binding",
      driverSdkBindingLiveProviderCallAttempted: false,
      driverSdkBindingLiveQueuePublishingEnabled: false,
      driverSdkBindingLiveWorkerExecutionEnabled: false,
      driverSdkBindingMode: "dry_run",
      driverSdkBindingOperationCount: queueProviderSdkBindingOperationCapabilities.length,
      driverSdkBindingPackageBindingBlockerCount: 0,
      driverSdkBindingPackageBindingBrowserBundleAllowed: false,
      driverSdkBindingPackageBindingFamily: "bullmq-redis-compatible",
      driverSdkBindingPackageBindingId: "bullmq-redis-package-binding-local",
      driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
      driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
      driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
      driverSdkBindingPackageBindingPackageName: "bullmq",
      driverSdkBindingPackageBindingPackageRef: "npm:bullmq",
      driverSdkBindingPackageBindingSdkClientConstructed: false,
      driverSdkBindingPackageBindingStatus: "local_ready",
      driverSdkBindingProductionReady: false,
      driverSdkBindingProviderKind: "local-stub",
      driverSdkBindingSdkClientConstructed: false,
      driverSdkBindingSdkPackageRef: "local-stub-sdk-package",
      driverSdkBindingStatus: "local_ready",
      driverSdkBindingValid: true,
      driverStatus: "local_ready",
      driverValid: true,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      observabilityExporterBlockerCount: 0,
      observabilityExporterDiagnosticCodes: [],
      observabilityExporterId: "local-dry-run",
      observabilityExporterLiveTelemetryExportEnabled: false,
      observabilityExporterMode: "dry_run",
      observabilityExporterSinkId: "local-metrics-sink",
      observabilityExporterStatus: "local_ready",
      operationCount: queueProviderOperationCapabilities.length,
      productionReady: false,
    });
    expect(foundation.driver).toMatchObject({
      activationGateSatisfied: false,
      blockerCount: 0,
      driverId: "local-fake-queue-provider-driver",
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      mode: "dry_run",
      productionReady: false,
      providerId: "local-fake",
      sdkBinding: expect.objectContaining({
        bindingId: "local-stub-queue-provider-sdk-binding",
        liveProviderCallAttempted: false,
        mode: "dry_run",
        packageBinding: expect.objectContaining({
          bindingId: "bullmq-redis-package-binding-local",
          liveBrokerConnectionAttempted: false,
          packageName: "bullmq",
          packageRef: "npm:bullmq",
          productionReady: false,
          sdkClientConstructed: false,
          status: "local_ready",
          valid: true,
        }),
        providerKind: "local-stub",
        sdkClientConstructed: false,
        sdkPackageRef: "local-stub-sdk-package",
        status: "local_ready",
        valid: true,
      }),
      status: "local_ready",
      valid: true,
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
  });

  it("keeps every queue provider operation metadata-only or disabled for staging", () => {
    const foundation = createQueueProviderAdapterFoundation({
      profileId: "staging-scaffold",
      providerId: "metadata-only",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.mode).toBe("metadata_only");
    expect(foundation.valid).toBe(true);
    expect(foundation.driver).toMatchObject({
      driverId: "metadata-only-queue-provider-driver",
      mode: "metadata_only",
      providerId: "metadata-only",
      sdkBinding: expect.objectContaining({
        bindingId: "metadata-only-queue-provider-sdk-binding",
        mode: "metadata_only",
        packageBinding: expect.objectContaining({
          bindingId: "bullmq-redis-package-binding-staging",
          mode: "metadata_only",
          packageName: "bullmq",
          status: "scaffolded",
          valid: true,
        }),
        providerKind: "redis-compatible",
        sdkClientConstructed: false,
        sdkPackageRef: "metadata-only-sdk-package",
        status: "scaffolded",
        valid: true,
      }),
      status: "scaffolded",
      valid: true,
    });
    expect(foundation.operationCapabilities.map((item) => item.operation)).toEqual([
      "publish",
      "delayed_publish",
      "ack",
      "nack",
      "lease",
      "retry",
      "dead_letter",
      "metrics",
    ]);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
    expect(foundation.noLiveFlags).toEqual({
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
  });

  it("fails closed for production-required when provider preconditions are missing", () => {
    const foundation = createQueueProviderAdapterFoundation({
      profileId: "production-required",
      providerId: "production-queue-provider",
    });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(
      queueProviderAdapterProductionPreconditions.length + foundation.driver.blockerCount,
    );
    expect(foundation.diagnosticCodes).toEqual([
      "QUEUE_PROVIDER_MISSING",
      "QUEUE_PROVIDER_ENDPOINT_MISSING",
      "QUEUE_PROVIDER_CREDENTIALS_MISSING",
      "QUEUE_PROVIDER_ENDPOINT_MISSING",
      "QUEUE_PROVIDER_DEAD_LETTER_MISSING",
      "QUEUE_PROVIDER_RETRY_POLICY_MISSING",
      "QUEUE_PROVIDER_IDEMPOTENCY_STORE_MISSING",
      "QUEUE_PROVIDER_WORKER_LEASE_MISSING",
      "QUEUE_PROVIDER_OBSERVABILITY_MISSING",
      "QUEUE_PROVIDER_DRIVER_MISSING",
      "QUEUE_PROVIDER_DRIVER_ENDPOINT_MISSING",
      "QUEUE_PROVIDER_DRIVER_CREDENTIALS_MISSING",
      "QUEUE_PROVIDER_DRIVER_QUEUE_ROUTE_MISSING",
      "QUEUE_PROVIDER_DRIVER_DEAD_LETTER_ROUTE_MISSING",
      "QUEUE_PROVIDER_DRIVER_RETRY_POLICY_MISSING",
      "QUEUE_PROVIDER_DRIVER_IDEMPOTENCY_STORE_MISSING",
      "QUEUE_PROVIDER_DRIVER_WORKER_LEASE_MISSING",
      "QUEUE_PROVIDER_DRIVER_OBSERVABILITY_MISSING",
      "QUEUE_PROVIDER_DRIVER_RUNBOOK_MISSING",
      "QUEUE_PROVIDER_DRIVER_LIVE_ENABLEMENT_MISSING",
      "QUEUE_PROVIDER_SDK_PACKAGE_MISSING",
      "QUEUE_PROVIDER_SDK_BINDING_MISSING",
      "QUEUE_PROVIDER_DRIVER_MISSING",
      "QUEUE_PROVIDER_SDK_ENDPOINT_MISSING",
      "QUEUE_PROVIDER_SDK_CREDENTIALS_MISSING",
      "QUEUE_PROVIDER_SDK_QUEUE_ROUTE_MISSING",
      "QUEUE_PROVIDER_SDK_DEAD_LETTER_ROUTE_MISSING",
      "QUEUE_PROVIDER_SDK_RETRY_POLICY_MISSING",
      "QUEUE_PROVIDER_SDK_IDEMPOTENCY_STORE_MISSING",
      "QUEUE_PROVIDER_SDK_WORKER_LEASE_MISSING",
      "QUEUE_PROVIDER_SDK_OBSERVABILITY_MISSING",
      "QUEUE_PROVIDER_SDK_RUNBOOK_MISSING",
      "QUEUE_PROVIDER_SDK_LIVE_ENABLEMENT_MISSING",
      "QUEUE_PROVIDER_PACKAGE_MISSING",
      "QUEUE_PROVIDER_PACKAGE_BINDING_MISSING",
      "QUEUE_PROVIDER_PACKAGE_PROVIDER_KIND_MISSING",
      "QUEUE_PROVIDER_PACKAGE_REDIS_ENDPOINT_MISSING",
      "QUEUE_PROVIDER_PACKAGE_CREDENTIALS_MISSING",
      "QUEUE_PROVIDER_PACKAGE_WORKER_QUEUE_MISSING",
      "QUEUE_PROVIDER_PACKAGE_DEAD_LETTER_QUEUE_MISSING",
      "QUEUE_PROVIDER_PACKAGE_RETRY_POLICY_MISSING",
      "QUEUE_PROVIDER_PACKAGE_IDEMPOTENCY_STORE_MISSING",
      "QUEUE_PROVIDER_PACKAGE_WORKER_LEASE_MISSING",
      "QUEUE_PROVIDER_PACKAGE_OBSERVABILITY_MISSING",
      "QUEUE_PROVIDER_PACKAGE_RUNBOOK_MISSING",
      "QUEUE_PROVIDER_PACKAGE_LIVE_ENABLEMENT_MISSING",
    ]);
    expect(foundation.driver.status).toBe("blocked");
    expect(foundation.driver.activationGateSatisfied).toBe(false);
    expect(foundation.driver.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.driver.sdkBinding.status).toBe("blocked");
    expect(foundation.driver.sdkBinding.sdkClientConstructed).toBe(false);
    expect(foundation.driver.sdkBinding.liveProviderCallAttempted).toBe(false);
    expect(foundation.driver.sdkBinding.packageBinding.status).toBe("blocked");
    expect(foundation.driver.sdkBinding.packageBinding.liveBrokerConnectionAttempted).toBe(false);
  });

  it("can report production-required config shape without becoming production ready", () => {
    const foundation = createQueueProviderAdapterFoundation({
      env: {
        CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:review",
        CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
        CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
        CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
        CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
        CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_BINDING: "production-provider-sdk-binding",
        CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "production-provider-driver",
        CAMPAIGN_OS_QUEUE_PROVIDER: "production-queue-provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "queue-endpoint-ref:provider",
        CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
        CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
        CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
        CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE: "package-ref:@provider/queue-sdk",
        CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
        CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:review",
        CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
        CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
      },
      profileId: "production-required",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.profileId).toBe("production-required");
    expect(foundation.mode).toBe("production_required");
    expect(foundation.providerId).toBe("production-queue-provider");
    expect(foundation.driver).toMatchObject({
      activationGateSatisfied: true,
      blockerCount: 0,
      driverId: "production-provider-driver",
      liveQueuePublishingEnabled: false,
      mode: "production_required",
      productionReady: false,
      providerId: "production-queue-provider",
      sdkBinding: expect.objectContaining({
        bindingId: "production-provider-sdk-binding",
        blockerCount: 0,
        liveProviderCallAttempted: false,
        mode: "production_required",
        packageBinding: expect.objectContaining({
          bindingId: "bullmq-redis-package-binding-production",
          blockerCount: 0,
          liveBrokerConnectionAttempted: false,
          packageName: "bullmq",
          productionReady: false,
          sdkClientConstructed: false,
          status: "scaffolded",
          valid: true,
        }),
        productionReady: false,
        providerKind: "redis-compatible",
        sdkClientConstructed: false,
        sdkPackageRef: "package-ref:@provider/queue-sdk",
        status: "scaffolded",
        valid: true,
      }),
      status: "scaffolded",
      valid: true,
    });
    expect(foundation.readiness.driverSdkBindingSdkClientConstructed).toBe(false);
    expect(foundation.readiness.driverSdkBindingLiveProviderCallAttempted).toBe(false);
    expect(foundation.readiness.driverSdkBindingLiveQueuePublishingEnabled).toBe(false);
    expect(foundation.readiness.driverSdkBindingPackageBindingBlockerCount).toBe(0);
    expect(foundation.readiness.driverSdkBindingPackageBindingLiveBrokerConnectionAttempted).toBe(false);
    expect(foundation.readiness.driverSdkBindingPackageBindingPackageName).toBe("bullmq");
    expect(foundation.readiness.driverSdkBindingPackageBindingStatus).toBe("scaffolded");
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
    expect(foundation.observabilityExporter.requiredConfigKeys).toEqual(
      expect.arrayContaining(observabilityExporterProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
    );
    expect(foundation.observabilityExporter.productionReady).toBe(false);
    expect(foundation.observabilityExporter.liveTelemetryExportEnabled).toBe(false);
  });

  it("keeps queue provider readiness separate from worker lease store readiness", () => {
    const env = {
      CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:review",
      CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
      CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
      CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
      CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
      CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-provider",
      CAMPAIGN_OS_QUEUE_PROVIDER: "production-queue-provider",
      CAMPAIGN_OS_QUEUE_PROVIDER_BINDING: "production-provider-sdk-binding",
      CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-provider",
      CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "production-provider-driver",
      CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "queue-endpoint-ref:provider",
      CAMPAIGN_OS_QUEUE_PROVIDER_KIND: "redis-compatible",
      CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE: "bullmq",
      CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
      CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE: "package-ref:@provider/queue-sdk",
      CAMPAIGN_OS_REDIS_URL: "redis-ref:campaign-os",
      CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:review",
      CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
      CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
    };
    const provider = createQueueProviderAdapterFoundation({
      env,
      profileId: "production-required",
    });
    const leaseStore = createWorkerLeaseStoreFoundation({
      env,
      profileId: "production-required",
    });

    expect(provider.valid).toBe(true);
    expect(provider.status).toBe("scaffolded");
    expect(provider.readiness.blockerCount).toBe(0);
    expect(provider.readiness.requiredConfigKeys).toContain("CAMPAIGN_OS_WORKER_LEASE_STORE_URL");
    expect(provider.readiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(queueProviderSdkBindingProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
    );
    expect(provider.readiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(queueProviderPackageProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
    );
    expect(provider.readiness.requiredConfigKeys).not.toEqual(leaseStore.readiness.requiredConfigKeys);
    expect(provider.operationCapabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ liveEnabled: false, operation: "publish" }),
        expect.objectContaining({ liveEnabled: false, operation: "lease" }),
      ]),
    );

    expect(leaseStore.valid).toBe(false);
    expect(leaseStore.status).toBe("blocked");
    expect(leaseStore.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "WORKER_LEASE_STORE_MISSING",
        "WORKER_LEASE_CREDENTIALS_MISSING",
        "WORKER_LEASE_CLOCK_MISSING",
        "WORKER_LEASE_HEARTBEAT_POLICY_MISSING",
        "WORKER_LEASE_TTL_POLICY_MISSING",
        "WORKER_LEASE_RELEASE_POLICY_MISSING",
        "WORKER_LEASE_STALE_RECOVERY_MISSING",
        "WORKER_LEASE_FENCING_POLICY_MISSING",
      ]),
    );
    expect(leaseStore.readiness.requiredConfigKeys).toEqual(
      expect.arrayContaining(workerLeaseStoreProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
    );
    expect(leaseStore.operationCapabilities.map((item) => item.operation)).toEqual([
      "claim",
      "heartbeat",
      "release",
      "expire",
      "recover_stale",
      "reject_conflict",
      "fence",
      "metrics",
    ]);
    expect(workerLeaseOperationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
    expect(provider.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(provider.readiness.liveWorkerExecutionEnabled).toBe(false);
    expect(leaseStore.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(leaseStore.readiness.liveWorkerExecutionEnabled).toBe(false);
  });

  it("fails closed for unsupported or unsafe profiles and provider ids", () => {
    const unknownProfile = createQueueProviderAdapterFoundation({
      profileId: "live-provider-secret",
      providerId: "production-queue-provider",
    });
    const unsupportedProvider = createQueueProviderAdapterFoundation({
      profileId: "local-review",
      providerId: "redis",
    });
    const unsafeProvider = createQueueProviderAdapterFoundation({
      profileId: "local-review",
      providerId: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
    });
    const serialized = JSON.stringify({ unknownProfile, unsafeProvider });

    expect(unknownProfile.profileId).toBe("production-required");
    expect(unknownProfile.status).toBe("blocked");
    expect(unknownProfile.valid).toBe(false);
    expect(unknownProfile.diagnosticCodes[0]).toBe("UNKNOWN_QUEUE_PROVIDER_PROFILE");
    expect(unsupportedProvider.status).toBe("blocked");
    expect(unsupportedProvider.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "QUEUE_PROVIDER_UNSUPPORTED",
        "QUEUE_PROVIDER_DRIVER_UNSUPPORTED",
      ]),
    );
    expect(unsafeProvider.status).toBe("blocked");
    expect(unsafeProvider.providerId).toBe("blocked-provider");
    expect(unsafeProvider.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "UNSAFE_QUEUE_PROVIDER_CONFIG",
        "QUEUE_PROVIDER_DRIVER_UNSUPPORTED",
      ]),
    );
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret");
  });

  it("redacts provider URLs, credentials, tokens, payloads, object keys, signed URLs, and wallet addresses", () => {
    const rawFixture = {
      apiKey: "provider-api-key-123",
      bearerToken: "Bearer worker-token-456",
      nested: {
        objectKey: "tenant/raw/export.csv",
        providerPayload: "{\"walletAddress\":\"ELF_provider_wallet\",\"taskId\":\"task_raw\"}",
        providerResponse: "provider-response-fragment:secret",
        providerUrl: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
        queuePayload: "{\"job\":\"task-verification\",\"address\":\"ELF_payload_wallet\"}",
        sdkPackageRef: "https://registry.invalid/@scope/pkg?token=sdk-secret",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        webhookSecret: "hook-secret-000",
      },
      walletAddress: "ELF_raw_wallet",
    };

    const redacted = redactQueueProviderAdapterValue(rawFixture);
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("provider-api-key-123");
    expect(serialized).not.toContain("worker-token-456");
    expect(serialized).not.toContain("tenant/raw/export.csv");
    expect(serialized).not.toContain("ELF_provider_wallet");
    expect(serialized).not.toContain("task_raw");
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret");
    expect(serialized).not.toContain("provider-response-fragment");
    expect(serialized).not.toContain("sdk-secret");
    expect(serialized).not.toContain("ELF_payload_wallet");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("hook-secret-000");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).toContain("[redacted]");
  });
});
