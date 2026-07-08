import { describe, expect, it } from "vitest";
import {
  SUPPORTED_QUEUE_PROVIDER_SDK_BINDING_PROFILES,
  createQueueProviderSdkBindingFoundation,
  executeLocalStubQueueProviderSdkOperation,
  getQueueProviderSdkBindingRegistration,
  queueProviderSdkBindingNoLiveFlags,
  queueProviderSdkBindingOperationCapabilities,
  queueProviderSdkBindingProductionPreconditions,
  redactQueueProviderSdkBindingValue,
} from "./queueProviderSdkBinding";

const productionReadyBindingEnv = {
  CAMPAIGN_OS_DEAD_LETTER_QUEUE: "dead-letter-ref:review",
  CAMPAIGN_OS_DEGRADATION_POLICY: "degradation:manual-review",
  CAMPAIGN_OS_IDEMPOTENCY_STORE_URL: "idempotency-store-ref:review",
  CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:review",
  CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:queue-provider-sdk-binding",
  CAMPAIGN_OS_QUEUE_PROVIDER_BINDING: "production-provider-sdk-binding",
  CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS: "credential-ref:queue-provider-sdk",
  CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER: "production-provider-driver",
  CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT: "queue-endpoint-ref:provider-sdk",
  CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE: "package-ref:@provider/queue-sdk",
  CAMPAIGN_OS_WORKER_LEASE_STORE_URL: "lease-store-ref:review",
  CAMPAIGN_OS_WORKER_QUEUE_URL: "queue-ref:worker",
  CAMPAIGN_OS_WORKER_RETRY_POLICY: "retry:exponential",
} satisfies Record<string, unknown>;

describe("queue provider sdk binding foundation", () => {
  it("declares a stable local stub registration and supported operations", () => {
    const foundation = createQueueProviderSdkBindingFoundation();
    const registration = getQueueProviderSdkBindingRegistration("local-stub-queue-provider-sdk-binding");

    expect(foundation.id).toBe("campaign-os-queue-provider-sdk-binding-foundation");
    expect(SUPPORTED_QUEUE_PROVIDER_SDK_BINDING_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
    expect(registration).toMatchObject({
      bindingId: "local-stub-queue-provider-sdk-binding",
      driverId: "local-stub-queue-provider-driver",
      providerId: "local-stub",
      providerKind: "local-stub",
      sdkPackageRef: "local-stub-sdk-package",
      status: "local_ready",
    });
    expect(foundation.operationCapabilities.map((item) => item.operation)).toEqual([
      "publish",
      "delayed_publish",
      "ack",
      "nack",
      "retry",
      "dead_letter",
      "lease_handoff",
      "metrics",
    ]);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
  });

  it("keeps local review deterministic, valid, fast, and no-live", () => {
    const startedAt = performance.now();
    const foundation = createQueueProviderSdkBindingFoundation({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.providerId).toBe("local-stub");
    expect(foundation.driverId).toBe("local-stub-queue-provider-driver");
    expect(foundation.bindingId).toBe("local-stub-queue-provider-sdk-binding");
    expect(foundation.sdkPackageRef).toBe("local-stub-sdk-package");
    expect(foundation.providerKind).toBe("local-stub");
    expect(foundation.mode).toBe("dry_run");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.sdkClientConstructed).toBe(false);
    expect(foundation.liveProviderCallAttempted).toBe(false);
    expect(foundation.noLiveFlags).toEqual(queueProviderSdkBindingNoLiveFlags);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.readiness).toMatchObject({
      activationGateSatisfied: false,
      bindingId: "local-stub-queue-provider-sdk-binding",
      blockerCount: 0,
      disabledLiveOperationCount: queueProviderSdkBindingOperationCapabilities.length,
      liveProviderCallsEnabled: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      operationCount: queueProviderSdkBindingOperationCapabilities.length,
      productionReady: false,
      valid: true,
    });
  });

  it("reports staging scaffold as metadata-only without provider client construction", () => {
    const foundation = createQueueProviderSdkBindingFoundation({
      bindingId: "metadata-only-queue-provider-sdk-binding",
      profileId: "staging-scaffold",
      providerId: "metadata-only",
      providerKind: "redis-compatible",
      sdkPackageRef: "metadata-only-sdk-package",
    });

    expect(foundation.mode).toBe("metadata_only");
    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.sdkClientConstructed).toBe(false);
    expect(foundation.readiness.liveProviderCallsEnabled).toBe(false);
    expect(foundation.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
  });

  it("fails closed for production-required when preconditions and activation are missing", () => {
    const foundation = createQueueProviderSdkBindingFoundation({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(queueProviderSdkBindingProductionPreconditions.length);
    expect(foundation.diagnosticCodes).toEqual([
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
    ]);
  });

  it("keeps production-required scaffolded but not production-ready after all gates are explicit", () => {
    const foundation = createQueueProviderSdkBindingFoundation({
      env: productionReadyBindingEnv,
      profileId: "production-required",
      providerId: "production-queue-provider",
      providerKind: "sqs-compatible",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.profileId).toBe("production-required");
    expect(foundation.mode).toBe("production_required");
    expect(foundation.bindingId).toBe("production-provider-sdk-binding");
    expect(foundation.driverId).toBe("production-provider-driver");
    expect(foundation.sdkPackageRef).toBe("package-ref:@provider/queue-sdk");
    expect(foundation.readiness.activationGateSatisfied).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.readiness.productionReady).toBe(false);
    expect(foundation.readiness.liveProviderCallsEnabled).toBe(false);
    expect(foundation.readiness.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.sdkClientConstructed).toBe(false);
  });

  it("accepts deterministic local stub operation metadata for all supported operations", () => {
    const startedAt = performance.now();
    const results = queueProviderSdkBindingOperationCapabilities.map((capability) =>
      executeLocalStubQueueProviderSdkOperation({
        attempt: 1,
        idempotencyReference: "idem-ref:task-verification:001",
        jobId: "task-verification-worker",
        operation: capability.operation,
        payloadReference: "payload-ref:task-verification:001",
        providerResponseReference: "provider-response-ref:local-stub:001",
        queueId: "verification-jobs",
        requestedAt: "2026-07-08T00:38:00Z",
        traceId: "trace:queue-provider-sdk-binding:001",
      }),
    );
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(results.every((item) => item.accepted)).toBe(true);
    expect(results.map((item) => item.status)).toEqual(
      queueProviderSdkBindingOperationCapabilities.map(() => "accepted_local_stub"),
    );
    expect(results[0]).toMatchObject({
      bindingId: "local-stub-queue-provider-sdk-binding",
      driverId: "local-stub-queue-provider-driver",
      idempotencyReference: "idem-ref:task-verification:001",
      liveProviderCallAttempted: false,
      livePublishAttempted: false,
      operationId: "local-stub:publish:verification-jobs:task-verification-worker:attempt-1",
      payloadReference: "payload-ref:task-verification:001",
      productionWriteAttempted: false,
      providerId: "local-stub",
      providerKind: "local-stub",
      queueId: "verification-jobs",
      sdkClientConstructed: false,
      traceId: "trace:queue-provider-sdk-binding:001",
    });
  });

  it("rejects unsafe or unknown local stub operation requests", () => {
    const result = executeLocalStubQueueProviderSdkOperation({
      attempt: 0,
      deadLetterReason: "https://queue-user:queue-pass@queue.invalid/dead-letter?token=secret",
      idempotencyReference: "idempotency-key-secret",
      jobId: "unknown-worker",
      operation: "publish",
      payloadReference: "{\"wallet\":\"ELF_ABC_private\",\"payload\":true}",
      providerResponseReference: "provider-response:Bearer secret-token",
      queueId: "unknown-queue",
      requestedAt: "not-a-date",
      traceId: " ",
    });

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "UNKNOWN_QUEUE_ID",
        "UNKNOWN_QUEUE_JOB",
        "MISSING_TRACE_ID",
        "INVALID_ATTEMPT",
        "UNSAFE_PAYLOAD_REFERENCE",
        "UNSAFE_IDEMPOTENCY_REFERENCE",
        "INVALID_PROVIDER_TIMESTAMP",
        "UNSAFE_DEAD_LETTER_REASON",
        "UNSAFE_PROVIDER_RESPONSE_REFERENCE",
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(JSON.stringify(result)).not.toContain("ELF_ABC_private");
    expect(JSON.stringify(result)).not.toContain("queue-user");
    expect(result.liveProviderCallAttempted).toBe(false);
    expect(result.productionWriteAttempted).toBe(false);
  });

  it("blocks production-required operation attempts while gates are missing", () => {
    const foundation = createQueueProviderSdkBindingFoundation({ profileId: "production-required" });
    const result = executeLocalStubQueueProviderSdkOperation(
      {
        attempt: 1,
        idempotencyReference: "idem-ref:task-verification:001",
        jobId: "task-verification-worker",
        operation: "publish",
        payloadReference: "payload-ref:task-verification:001",
        queueId: "verification-jobs",
        traceId: "trace:queue-provider-sdk-binding:001",
      },
      { foundation },
    );

    expect(result.accepted).toBe(false);
    expect(result.status).toBe("blocked_by_gate");
    expect(result.sdkClientConstructed).toBe(false);
    expect(result.liveProviderCallAttempted).toBe(false);
    expect(result.livePublishAttempted).toBe(false);
    expect(result.productionWriteAttempted).toBe(false);
    expect(result.diagnosticCodes).toContain("QUEUE_PROVIDER_SDK_LIVE_ENABLEMENT_MISSING");
  });

  it("redacts unsafe sdk, provider, queue, credential, payload, and response material", () => {
    const redacted = redactQueueProviderSdkBindingValue({
      apiKey: "api-key-secret",
      credential: "Bearer queue-secret-token",
      endpoint: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
      idempotencyKey: "idempotency-key-secret",
      leaseToken: "lease-token-secret",
      objectKey: "exports/private-winners.csv",
      payload: "{\"wallet\":\"ELF_ABC_private\",\"payload\":true}",
      providerResponse: "provider-response-fragment:secret",
      queueCredential: "queue-credential-secret",
      rawJson: "{\"secret\":\"raw-payload\"}",
      signedUrl: "https://storage.invalid/file.csv?X-Amz-Signature=signed-url-secret",
      walletAddress: "ELF_ABC_private",
      webhookSecret: "webhook-secret",
    });
    const serialized = JSON.stringify(redacted);

    expect(serialized).not.toContain("api-key-secret");
    expect(serialized).not.toContain("queue-user");
    expect(serialized).not.toContain("queue-pass");
    expect(serialized).not.toContain("queue-secret-token");
    expect(serialized).not.toContain("idempotency-key-secret");
    expect(serialized).not.toContain("lease-token-secret");
    expect(serialized).not.toContain("private-winners");
    expect(serialized).not.toContain("ELF_ABC_private");
    expect(serialized).not.toContain("raw-payload");
    expect(serialized).not.toContain("signed-url-secret");
    expect(serialized).toContain("[redacted]");
  });
});
