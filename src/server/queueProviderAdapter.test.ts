import { describe, expect, it } from "vitest";
import {
  SUPPORTED_QUEUE_PROVIDER_ADAPTER_PROFILES,
  createQueueProviderAdapterFoundation,
  queueProviderAdapterNoLiveFlags,
  queueProviderAdapterProductionPreconditions,
  queueProviderOperationCapabilities,
  redactQueueProviderAdapterValue,
} from "./queueProviderAdapter";

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
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      operationCount: queueProviderOperationCapabilities.length,
      productionReady: false,
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
    expect(foundation.blockerCount).toBe(queueProviderAdapterProductionPreconditions.length);
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
    ]);
  });

  it("can report production-required config shape without becoming production ready", () => {
    const foundation = createQueueProviderAdapterFoundation({
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

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.profileId).toBe("production-required");
    expect(foundation.mode).toBe("production_required");
    expect(foundation.providerId).toBe("production-queue-provider");
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags.liveQueuePublishingEnabled).toBe(false);
    expect(foundation.operationCapabilities.every((item) => item.liveEnabled === false)).toBe(true);
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
    expect(unsupportedProvider.diagnosticCodes).toEqual(["QUEUE_PROVIDER_UNSUPPORTED"]);
    expect(unsafeProvider.status).toBe("blocked");
    expect(unsafeProvider.providerId).toBe("blocked-provider");
    expect(unsafeProvider.diagnosticCodes).toEqual(["UNSAFE_QUEUE_PROVIDER_CONFIG"]);
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
        providerUrl: "https://queue-user:queue-pass@queue.invalid/jobs?token=queue-secret",
        queuePayload: "{\"job\":\"task-verification\",\"address\":\"ELF_payload_wallet\"}",
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
    expect(serialized).not.toContain("ELF_payload_wallet");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("hook-secret-000");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).toContain("[redacted]");
  });
});
