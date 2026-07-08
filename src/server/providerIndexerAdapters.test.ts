import { describe, expect, it } from "vitest";
import {
  SUPPORTED_PROVIDER_INDEXER_PROFILES,
  createProviderIndexerFoundation,
  providerIndexerAdapterGroups,
  providerIndexerNoLiveFlags,
  redactProviderIndexerValue,
} from "./providerIndexerAdapters";

describe("provider indexer adapter foundation", () => {
  it("declares a stable foundation id and supported runtime profiles", () => {
    const foundation = createProviderIndexerFoundation();

    expect(foundation.id).toBe("campaign-os-provider-indexer-foundation");
    expect(SUPPORTED_PROVIDER_INDEXER_PROFILES).toEqual([
      "local-review",
      "staging-scaffold",
      "production-required",
    ]);
  });

  it("covers the provider group catalog required by v0.2", () => {
    expect(providerIndexerAdapterGroups.map((group) => group.id)).toEqual([
      "wallet-auth-session",
      "aefinder-aelfscan-indexers",
      "dapp-api-adapters",
      "social-api-adapters",
      "manual-review",
      "ai-provider-adapters",
      "analytics-warehouse-adapter",
      "object-storage-adapter",
      "contract-reader-adapter",
      "contract-writer-adapter",
    ]);
    expect(providerIndexerAdapterGroups.map((group) => group.category)).toEqual([
      "wallet_auth",
      "indexer",
      "dapp_api",
      "social_api",
      "manual_review",
      "ai_provider",
      "analytics",
      "storage",
      "contract_reader",
      "contract_writer",
    ]);
    expect(providerIndexerAdapterGroups.every((group) => group.liveCallEnabled === false)).toBe(
      true,
    );
  });

  it("keeps local review deterministic, valid, and free of live provider calls", () => {
    const startedAt = performance.now();
    const foundation = createProviderIndexerFoundation({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(foundation.profileId).toBe("local-review");
    expect(foundation.status).toBe("local_ready");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(0);
    expect(foundation.noLiveFlags).toEqual(providerIndexerNoLiveFlags);
    expect(foundation.providerGroupCount).toBe(10);
    expect(foundation.verificationSourceCoverage.summaryCount).toBe(5);
    expect(foundation.diagnosticCodes).toEqual([]);
  });

  it("projects provider client registry metadata as reference-only local readiness", () => {
    const foundation = createProviderIndexerFoundation({ profileId: "local-review" });
    const indexerGroup = providerIndexerAdapterGroups.find(
      (group) => group.id === "aefinder-aelfscan-indexers",
    );
    const walletGroup = providerIndexerAdapterGroups.find(
      (group) => group.id === "wallet-auth-session",
    );

    expect(indexerGroup?.clientReadiness).toMatchObject({
      capabilityLabels: [
        "provider-client:verification_evaluation",
        "provider-client:redacted_diagnostics",
      ],
      circuitBreakerPolicyRef: "policy-ref:CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_POLICY",
      clientId: "provider-client:aefinder-aelfscan-indexers",
      credentialRef: "secret-ref:CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF",
      degradationPolicyRef: "policy-ref:CAMPAIGN_OS_PROVIDER_DEGRADATION_POLICY",
      endpointRef: "config-ref:CAMPAIGN_OS_PROVIDER_ENDPOINT_REF",
      providerClientRequired: true,
      readinessId: "campaign-os-provider-indexer-client-readiness",
      retryPolicyRef: "policy-ref:CAMPAIGN_OS_PROVIDER_RETRY_POLICY",
      supportedVerificationTypes: ["ON_CHAIN"],
      timeoutPolicyRef: "policy-ref:CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY",
    });
    expect(walletGroup?.clientReadiness).toMatchObject({
      providerClientRequired: false,
      supportedVerificationTypes: ["WALLET"],
    });
    expect(foundation.providerClientRegistry).toMatchObject({
      adapterFoundationId: "campaign-os-provider-indexer-foundation",
      clientReadinessId: "campaign-os-provider-indexer-client-readiness",
      executionBoundary: "metadata_only_no_sdk_no_live_calls",
      liveProviderCallsAttempted: false,
      productionReady: false,
      providerClientsEnabled: false,
      registryPresent: true,
      source: "provider-indexer-client-readiness",
      status: "disabled",
    });
    expect(foundation.providerClientRegistry.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          adapterGroupId: "aefinder-aelfscan-indexers",
          clientId: "provider-client:aefinder-aelfscan-indexers",
          endpointRef: "config-ref:CAMPAIGN_OS_PROVIDER_ENDPOINT_REF",
          providerClientRequired: true,
          readinessStatus: "disabled",
          supportedVerificationTypes: ["ON_CHAIN"],
        }),
      ]),
    );
  });

  it("keeps every live integration and worker execution disabled", () => {
    expect(providerIndexerNoLiveFlags).toEqual({
      liveAiCallsEnabled: false,
      liveAnalyticsIngestionEnabled: false,
      liveContractCallsEnabled: false,
      liveIndexerCallsEnabled: false,
      liveObjectStorageEnabled: false,
      liveProviderCallsEnabled: false,
      liveSocialCallsEnabled: false,
      workerExecutionEnabled: false,
    });

    const foundation = createProviderIndexerFoundation({ profileId: "staging-scaffold" });

    expect(foundation.status).toBe("scaffolded");
    expect(foundation.valid).toBe(true);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.noLiveFlags).toEqual(providerIndexerNoLiveFlags);
  });

  it("fails closed for production-required when provider handoff preconditions are missing", () => {
    const foundation = createProviderIndexerFoundation({ profileId: "production-required" });

    expect(foundation.status).toBe("blocked");
    expect(foundation.valid).toBe(false);
    expect(foundation.productionReady).toBe(false);
    expect(foundation.blockerCount).toBe(5);
    expect(foundation.diagnosticCodes).toEqual([
      "PROVIDER_REGISTRY_ENDPOINT_MISSING",
      "INDEXER_ENDPOINT_MISSING",
      "PROVIDER_CREDENTIALS_MISSING",
      "DEGRADATION_POLICY_MISSING",
      "WORKER_HANDOFF_MISSING",
    ]);
    expect(foundation.diagnostics.map((diagnostic) => diagnostic.severity)).toEqual([
      "error",
      "error",
      "error",
      "error",
      "error",
    ]);
    expect(foundation.providerClientRegistry).toMatchObject({
      blockerCount: 13,
      productionReady: false,
      providerClientsEnabled: false,
      registryPresent: true,
      status: "blocked",
    });
    expect(foundation.providerClientRegistry.diagnosticCodes).toEqual([
      "PROVIDER_CLIENT_ACTIVATION_MISSING",
      "PROVIDER_CLIENT_REGISTRY_ENDPOINT_MISSING",
      "PROVIDER_CLIENT_ENDPOINT_REFERENCE_MISSING",
      "PROVIDER_CLIENT_CREDENTIAL_REFERENCE_MISSING",
      "PROVIDER_CLIENT_SEAM_MISSING",
      "PROVIDER_CLIENT_TIMEOUT_POLICY_MISSING",
      "PROVIDER_CLIENT_RETRY_POLICY_MISSING",
      "PROVIDER_CLIENT_CIRCUIT_BREAKER_POLICY_MISSING",
      "PROVIDER_CLIENT_DEGRADATION_POLICY_MISSING",
      "PROVIDER_CLIENT_WORKER_QUEUE_HANDOFF_MISSING",
      "PROVIDER_CLIENT_CONSUME_READINESS_HANDOFF_MISSING",
      "PROVIDER_CLIENT_RUNBOOK_MISSING",
      "PROVIDER_CLIENT_REDACTION_POLICY_MISSING",
    ]);
    expect(foundation.providerClientRegistry.missingPreconditionRefs).toEqual([
      "provider-client-activation",
      "provider-client-registry-endpoint",
      "provider-client-endpoint-reference",
      "provider-client-credential-reference",
      "provider-client-seam",
      "provider-client-timeout-policy",
      "provider-client-retry-policy",
      "provider-client-circuit-breaker-policy",
      "provider-client-degradation-policy",
      "provider-client-worker-queue-handoff",
      "provider-client-consume-readiness-handoff",
      "provider-client-runbook",
      "provider-client-redaction-policy",
    ]);
    expect(foundation.providerClientRegistry.entries.every((entry) => entry.productionReady === false)).toBe(
      true,
    );
  });

  it("keeps provider client projection free of SDK, package, live-call, and secret assumptions", () => {
    const foundation = createProviderIndexerFoundation({
      env: {
        CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF: "api-key-live-123",
        CAMPAIGN_OS_PROVIDER_ENDPOINT_REF: "https://user:password@indexer.example/graphql?token=query-secret",
        CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY: "timeout-policy:2500ms",
      },
      profileId: "local-review",
    });
    const serialized = JSON.stringify(foundation.providerClientRegistry);

    expect(foundation.providerClientRegistry.executionBoundary).toBe(
      "metadata_only_no_sdk_no_live_calls",
    );
    expect(foundation.providerClientRegistry.liveProviderCallsAttempted).toBe(false);
    expect(serialized).not.toContain("api-key-live-123");
    expect(serialized).not.toContain("user:password");
    expect(serialized).not.toContain("query-secret");
    expect(serialized).not.toMatch(/sdkPackage|packageName|liveCallUrl|executeProvider/i);
  });

  it("sanitizes provider secrets, credentialed URLs, signed URLs, and payload fragments", () => {
    const rawFixture = {
      apiKey: "api-key-live-123",
      bearerToken: "Bearer live-token-456",
      nested: {
        objectKey: "tenant/raw/object-key.csv",
        providerPayload: "{\"address\":\"ELF_raw_wallet\",\"score\":99}",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        socialToken: "social-token-789",
        webhookSecret: "hook-secret-000",
      },
      providerUrl: "https://user:password@indexer.example/graphql?token=query-secret",
      secret: "plain-secret-value",
    };

    const redacted = redactProviderIndexerValue(rawFixture);
    const foundation = createProviderIndexerFoundation({
      env: {
        CAMPAIGN_OS_PROVIDER_CREDENTIALS: rawFixture.apiKey,
        CAMPAIGN_OS_PROVIDER_REGISTRY_URL: rawFixture.providerUrl,
        CAMPAIGN_OS_PROVIDER_SAMPLE_PAYLOAD: rawFixture.nested.providerPayload,
      },
      profileId: "production-required",
    });
    const serialized = JSON.stringify({ foundation, redacted });

    expect(serialized).not.toContain("api-key-live-123");
    expect(serialized).not.toContain("live-token-456");
    expect(serialized).not.toContain("tenant/raw/object-key.csv");
    expect(serialized).not.toContain("ELF_raw_wallet");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("social-token-789");
    expect(serialized).not.toContain("hook-secret-000");
    expect(serialized).not.toContain("user:password");
    expect(serialized).not.toContain("query-secret");
    expect(serialized).not.toContain("plain-secret-value");
    expect(serialized).toContain("[redacted]");
  });
});
