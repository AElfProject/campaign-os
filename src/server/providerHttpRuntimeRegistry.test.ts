import { describe, expect, it } from "vitest";
import {
  createProviderHttpDownstreamLiveFlags,
  createProviderHttpRuntimeSummary,
  findProviderHttpEndpointById,
  findProviderHttpEndpointForVerification,
  listProviderHttpEndpointEntries,
  providerHttpRuntimeProductionPreconditions,
} from "./providerHttpRuntimeRegistry";

const productionReadyProviderHttpEnv = {
  CAMPAIGN_OS_PROVIDER_HTTP_CREDENTIAL_REF: "credential-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REF: "config-ref:provider-http-endpoint",
  CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REGISTRY_REF: "config-ref:provider-http-registry",
  CAMPAIGN_OS_PROVIDER_HTTP_HEADER_REF: "header-ref:provider-http-auth",
  CAMPAIGN_OS_PROVIDER_HTTP_IDEMPOTENCY_REF: "idem-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_LEASE_REF: "lease-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_QUEUE_WORKER_HANDOFF: "config-ref:provider-http-worker",
  CAMPAIGN_OS_PROVIDER_HTTP_REDACTION_POLICY: "policy-ref:provider-http-redaction",
  CAMPAIGN_OS_PROVIDER_HTTP_RESPONSE_MAPPING_POLICY: "policy-ref:provider-http-response-map",
  CAMPAIGN_OS_PROVIDER_HTTP_RUNBOOK_REF: "runbook-ref:provider-http",
  CAMPAIGN_OS_PROVIDER_HTTP_RUNTIME_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_PROVIDER_HTTP_TIMEOUT_POLICY: "timeout-policy:2500ms",
  CAMPAIGN_OS_PROVIDER_HTTP_TRANSPORT_SEAM: "config-ref:provider-http-transport",
} satisfies Record<string, unknown>;

describe("provider HTTP runtime registry", () => {
  it("keeps local review and staging scaffold deterministic and no-live", () => {
    const startedAt = performance.now();
    const local = createProviderHttpRuntimeSummary({ profileId: "local-review" });
    const staging = createProviderHttpRuntimeSummary({ profileId: "staging-scaffold" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(local).toMatchObject({
      activationStatus: "disabled",
      blockerCount: 0,
      id: "campaign-os-provider-http-client-runtime",
      liveHttpCallsAttempted: false,
      productionReady: false,
      status: "disabled",
      transportProvided: false,
      valid: true,
    });
    expect(staging).toMatchObject({
      activationStatus: "metadata_only",
      blockerCount: 0,
      liveHttpCallsAttempted: false,
      productionReady: false,
      status: "disabled",
      transportProvided: false,
      valid: true,
    });
    expect(local.downstreamLiveFlags).toEqual(createProviderHttpDownstreamLiveFlags());
    expect(Object.values(local.downstreamLiveFlags).every((value) => value === false)).toBe(true);
    expect(staging.diagnosticCodes).toEqual([]);
  });

  it("fails closed for production-required when provider HTTP dependencies are missing", () => {
    const summary = createProviderHttpRuntimeSummary({ profileId: "production-required" });

    expect(summary.status).toBe("blocked");
    expect(summary.activationStatus).toBe("activation_required");
    expect(summary.valid).toBe(false);
    expect(summary.productionReady).toBe(false);
    expect(summary.liveHttpCallsAttempted).toBe(false);
    expect(summary.transportProvided).toBe(false);
    expect(summary.blockerCount).toBe(providerHttpRuntimeProductionPreconditions.length);
    expect(summary.diagnosticCodes).toEqual(
      providerHttpRuntimeProductionPreconditions.map((item) => item.diagnosticCode),
    );
    expect(summary.diagnostics.every((diagnostic) => diagnostic.severity === "blocker")).toBe(
      true,
    );
  });

  it("activates only when production refs and an injected transport seam are present", () => {
    const summary = createProviderHttpRuntimeSummary({
      env: productionReadyProviderHttpEnv,
      profileId: "production-required",
      transportProvided: true,
    });

    expect(summary).toMatchObject({
      activationStatus: "explicitly_enabled",
      blockerCount: 0,
      liveHttpCallsAttempted: false,
      productionReady: false,
      status: "activated",
      transportProvided: true,
      valid: true,
    });
    expect(Object.values(summary.downstreamLiveFlags).every((value) => value === false)).toBe(
      true,
    );
  });

  it("publishes indexer and dApp API endpoint metadata as refs only", () => {
    const endpoints = listProviderHttpEndpointEntries();
    const serialized = JSON.stringify(endpoints);

    expect(endpoints.map((endpoint) => endpoint.category)).toEqual(
      expect.arrayContaining(["indexer", "dapp_api"]),
    );
    expect(
      endpoints.some((endpoint) => endpoint.providerGroupId === "aefinder-aelfscan-indexers"),
    ).toBe(true);
    expect(endpoints.some((endpoint) => endpoint.providerGroupId === "dapp-api-adapters")).toBe(
      true,
    );
    expect(endpoints.every((endpoint) => !endpoint.urlTemplateRef.startsWith("http"))).toBe(true);
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("api-key");
    expect(serialized).not.toContain("secret=");
    expect(serialized).not.toContain("password");
  });

  it("looks up endpoints by id and blocks verification type mismatches", () => {
    const indexer = findProviderHttpEndpointById("aefinder-aelfscan-indexer-query");
    const matchingEndpoint = findProviderHttpEndpointForVerification({
      endpointId: "aefinder-aelfscan-indexer-query",
      providerGroupId: "aefinder-aelfscan-indexers",
      verificationType: "ON_CHAIN",
    });
    const mismatchedEndpoint = findProviderHttpEndpointForVerification({
      endpointId: "aefinder-aelfscan-indexer-query",
      providerGroupId: "aefinder-aelfscan-indexers",
      verificationType: "DAPP_API",
    });

    expect(indexer).toMatchObject({
      category: "indexer",
      endpointId: "aefinder-aelfscan-indexer-query",
      method: "POST",
    });
    expect(matchingEndpoint?.endpointId).toBe("aefinder-aelfscan-indexer-query");
    expect(mismatchedEndpoint).toBeUndefined();
  });

  it("blocks unsafe provider HTTP config without serializing raw material", () => {
    const summary = createProviderHttpRuntimeSummary({
      env: {
        ...productionReadyProviderHttpEnv,
        CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REF:
          "https://user:password@indexer.example/graphql?token=query-secret",
      },
      profileId: "production-required",
      transportProvided: true,
    });
    const serialized = JSON.stringify(summary);

    expect(summary.status).toBe("blocked");
    expect(summary.diagnosticCodes).toEqual(
      expect.arrayContaining(["PROVIDER_HTTP_UNSAFE_CONFIG"]),
    );
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("query-secret");
  });
});
