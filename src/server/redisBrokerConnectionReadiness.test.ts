import { describe, expect, it } from "vitest";
import {
  SUPPORTED_REDIS_BROKER_CONNECTION_PROFILES,
  createRedisBrokerConnectionReadiness,
  getRedisBrokerConnectionReadinessRegistration,
  redisBrokerConnectionNoLiveFlags,
  redisBrokerConnectionProductionPreconditions,
  redactRedisBrokerConnectionValue,
} from "./redisBrokerConnectionReadiness";

const productionReadyBrokerEnv = {
  CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL: "observability-ref:redis-broker",
  CAMPAIGN_OS_OPERATOR_RUNBOOK_URL: "runbook-ref:redis-broker",
  CAMPAIGN_OS_QUEUE_PROVIDER_PACKAGE_BINDING: "bullmq-redis-package-binding-production",
  CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "circuit-breaker:fail-closed",
  CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "2500",
  CAMPAIGN_OS_REDIS_CREDENTIALS: "credential-ref:redis-broker",
  CAMPAIGN_OS_REDIS_DATABASE: "database-ref:0",
  CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "retry-backoff:exponential",
  CAMPAIGN_OS_REDIS_TLS_POLICY: "tls-policy:required",
  CAMPAIGN_OS_REDIS_URL: "redis-endpoint-ref:campaign-os",
} satisfies Record<string, unknown>;

describe("redis broker connection readiness foundation", () => {
  it("declares approved local-review broker metadata with no live attempts", () => {
    const startedAt = performance.now();
    const foundation = createRedisBrokerConnectionReadiness({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;
    const registration = getRedisBrokerConnectionReadinessRegistration("redis-broker-connection-local");

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.id).toBe("campaign-os-redis-broker-connection-readiness");
    expect(SUPPORTED_REDIS_BROKER_CONNECTION_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
    expect(registration).toMatchObject({
      connectionId: "redis-broker-connection-local",
      healthCheckMode: "disabled",
      mode: "dry_run",
      packageBindingId: "bullmq-redis-package-binding-local",
      providerKind: "redis-compatible",
      status: "local_ready",
    });
    expect(foundation).toMatchObject({
      blockerCount: 0,
      browserBundleAllowed: false,
      connectionId: "redis-broker-connection-local",
      credentialReferenceStatus: "not_configured",
      databaseSelectionStatus: "not_configured",
      endpointReferenceStatus: "not_configured",
      healthCheckMode: "disabled",
      liveBrokerConnectionAttempted: false,
      liveBrokerHealthCheckAttempted: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      mode: "dry_run",
      packageBindingId: "bullmq-redis-package-binding-local",
      productionReady: false,
      profileId: "local-review",
      providerKind: "redis-compatible",
      queueClientConstructed: false,
      queueEventsConstructed: false,
      sdkClientConstructed: false,
      status: "local_ready",
      valid: true,
      workerConstructed: false,
    });
    expect(foundation.noLiveFlags).toEqual(redisBrokerConnectionNoLiveFlags);
    expect(foundation.diagnosticCodes).toEqual([]);
    expect(foundation.healthCheck).toMatchObject({
      adapterId: "metadata-only-redis-broker-health-check",
      liveBrokerHealthCheckAttempted: false,
      metadataOnly: true,
      networkCallAttempted: false,
      productionReady: false,
      status: "local_ok",
    });
    expect(foundation.readiness).toMatchObject({
      browserBundleAllowed: false,
      liveBrokerConnectionAttempted: false,
      liveBrokerHealthCheckAttempted: false,
      liveQueuePublishingEnabled: false,
      liveWorkerExecutionEnabled: false,
      productionReady: false,
      queueClientConstructed: false,
      queueEventsConstructed: false,
      sdkClientConstructed: false,
      valid: true,
      workerConstructed: false,
    });
  });

  it("reports staging scaffold as reference-only metadata without live broker calls", () => {
    const foundation = createRedisBrokerConnectionReadiness({
      env: {
        CAMPAIGN_OS_REDIS_CIRCUIT_BREAKER_POLICY: "circuit-breaker:review",
        CAMPAIGN_OS_REDIS_CONNECTION_TIMEOUT_MS: "1500",
        CAMPAIGN_OS_REDIS_CREDENTIALS: "credential-ref:staging-redis",
        CAMPAIGN_OS_REDIS_DATABASE: "database-ref:staging",
        CAMPAIGN_OS_REDIS_RETRY_BACKOFF_POLICY: "retry-backoff:review",
        CAMPAIGN_OS_REDIS_TLS_POLICY: "tls-policy:required",
        CAMPAIGN_OS_REDIS_URL: "redis-endpoint-ref:staging",
      },
      profileId: "staging-scaffold",
    });

    expect(foundation.mode).toBe("metadata_only");
    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.endpointReferenceStatus).toBe("reference_only");
    expect(foundation.credentialReferenceStatus).toBe("reference_only");
    expect(foundation.tlsPolicyStatus).toBe("validated_reference");
    expect(foundation.databaseSelectionStatus).toBe("reference_only");
    expect(foundation.timeoutPolicyStatus).toBe("configured");
    expect(foundation.retryBackoffPolicyStatus).toBe("configured");
    expect(foundation.circuitBreakerPolicyStatus).toBe("configured");
    expect(foundation.observabilityHandoffStatus).toBe("not_configured");
    expect(foundation.operatorRunbookStatus).toBe("not_configured");
    expect(foundation.healthCheckMode).toBe("metadata_only");
    expect(foundation.healthCheck.liveBrokerHealthCheckAttempted).toBe(false);
    expect(foundation.liveBrokerConnectionAttempted).toBe(false);
    expect(foundation.queueClientConstructed).toBe(false);
    expect(foundation.workerConstructed).toBe(false);
  });

  it("fails closed for production-required when broker preconditions are missing", () => {
    const foundation = createRedisBrokerConnectionReadiness({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(redisBrokerConnectionProductionPreconditions.length);
    expect(foundation.diagnosticCodes).toEqual([
      "REDIS_BROKER_ENDPOINT_REFERENCE_MISSING",
      "REDIS_BROKER_CREDENTIALS_REFERENCE_MISSING",
      "REDIS_BROKER_TLS_POLICY_MISSING",
      "REDIS_BROKER_DATABASE_SELECTION_MISSING",
      "REDIS_BROKER_TIMEOUT_POLICY_MISSING",
      "REDIS_BROKER_RETRY_BACKOFF_POLICY_MISSING",
      "REDIS_BROKER_CIRCUIT_BREAKER_POLICY_MISSING",
      "REDIS_BROKER_OBSERVABILITY_HANDOFF_MISSING",
      "REDIS_BROKER_RUNBOOK_MISSING",
      "REDIS_BROKER_HEALTH_CHECK_ENABLEMENT_MISSING",
    ]);
    expect(foundation.endpointReferenceStatus).toBe("blocked");
    expect(foundation.credentialReferenceStatus).toBe("blocked");
    expect(foundation.tlsPolicyStatus).toBe("required");
    expect(foundation.databaseSelectionStatus).toBe("blocked");
    expect(foundation.timeoutPolicyStatus).toBe("blocked");
    expect(foundation.retryBackoffPolicyStatus).toBe("blocked");
    expect(foundation.circuitBreakerPolicyStatus).toBe("blocked");
    expect(foundation.observabilityHandoffStatus).toBe("deferred");
    expect(foundation.operatorRunbookStatus).toBe("deferred");
    expect(foundation.healthCheckMode).toBe("activation_required");
    expect(foundation.healthCheck.liveBrokerHealthCheckAttempted).toBe(false);
  });

  it("keeps production-required scaffolded but not production-ready after all references are present", () => {
    const foundation = createRedisBrokerConnectionReadiness({
      env: productionReadyBrokerEnv,
      profileId: "production-required",
    });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.mode).toBe("production_required");
    expect(foundation.connectionId).toBe("redis-broker-connection-production");
    expect(foundation.packageBindingId).toBe("bullmq-redis-package-binding-production");
    expect(foundation.endpointReferenceStatus).toBe("reference_only");
    expect(foundation.credentialReferenceStatus).toBe("reference_only");
    expect(foundation.tlsPolicyStatus).toBe("validated_reference");
    expect(foundation.observabilityHandoffStatus).toBe("reference_only");
    expect(foundation.operatorRunbookStatus).toBe("reference_only");
    expect(foundation.healthCheckMode).toBe("metadata_only");
    expect(foundation.productionReady).toBe(false);
    expect(foundation.readiness.productionReady).toBe(false);
    expect(foundation.liveBrokerConnectionAttempted).toBe(false);
    expect(foundation.liveBrokerHealthCheckAttempted).toBe(false);
    expect(foundation.queueClientConstructed).toBe(false);
    expect(foundation.queueEventsConstructed).toBe(false);
    expect(foundation.workerConstructed).toBe(false);
    expect(foundation.sdkClientConstructed).toBe(false);
  });

  it("redacts broker credentials, tokens, payloads, provider responses, wallets, object keys, signed URLs, webhooks, leases, and idempotency keys", () => {
    const redacted = redactRedisBrokerConnectionValue({
      bearerToken: "Bearer redis-secret-token",
      credentialedRedisUrl: "redis://redis-user:redis-pass@redis.invalid:6379/0",
      idempotencyKey: "idempotency-key-secret",
      leaseToken: "lease-token-secret",
      objectKey: "s3://bucket/private/object",
      password: "redis-pass",
      payloadFragment: "{\"wallet\":\"ELF_ABC_private\",\"payload\":true}",
      providerResponse: "redis provider returned Bearer provider-secret",
      signedUrl: "https://files.invalid/report.csv?X-Amz-Signature=abc",
      webhookSecret: "webhook-secret-value",
      walletAddress: "ELF_ABC_private",
    });

    expect(redacted).toEqual({
      bearerToken: "[redacted]",
      credentialedRedisUrl: "[redacted]",
      idempotencyKey: "[redacted]",
      leaseToken: "[redacted]",
      objectKey: "[redacted]",
      password: "[redacted]",
      payloadFragment: "[redacted]",
      providerResponse: "[redacted]",
      signedUrl: "[redacted]",
      webhookSecret: "[redacted]",
      walletAddress: "[redacted]",
    });
  });

  it("rejects unknown profile, mode, and provider without leaking unsafe material", () => {
    const foundation = createRedisBrokerConnectionReadiness({
      connectionId: "redis://redis-user:redis-pass@redis.invalid/0?token=secret",
      mode: "live",
      packageBindingId: "https://queue.invalid/package?token=secret",
      profileId: "unknown-profile",
      providerKind: "sqs-compatible",
    });

    expect(foundation.valid).toBe(false);
    expect(foundation.status).toBe("blocked");
    expect(foundation.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "UNKNOWN_REDIS_BROKER_CONNECTION_PROFILE",
        "UNKNOWN_REDIS_BROKER_CONNECTION_MODE",
        "UNKNOWN_REDIS_BROKER_PROVIDER_KIND",
        "UNSAFE_REDIS_BROKER_CONNECTION_CONFIG",
      ]),
    );
    expect(JSON.stringify(foundation)).not.toContain("redis-pass");
    expect(JSON.stringify(foundation)).not.toContain("token=secret");
    expect(foundation.liveBrokerConnectionAttempted).toBe(false);
    expect(foundation.liveBrokerHealthCheckAttempted).toBe(false);
  });

  it("does not expose a registration for unknown broker connections", () => {
    expect(getRedisBrokerConnectionReadinessRegistration("unknown-broker-connection")).toBeUndefined();
  });
});
