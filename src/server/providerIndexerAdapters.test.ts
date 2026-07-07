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
