import { describe, expect, it } from "vitest";
import {
  createProviderHttpDownstreamLiveFlags,
  createProviderHttpRuntimeSummary,
  findProviderHttpEndpointById,
  findProviderHttpEndpointForVerification,
  listProviderHttpEndpointEntries,
  providerHttpEndpointRegistry,
  providerHttpVerificationBindingExamples,
  providerHttpRuntimeProductionPreconditions,
  validateProviderHttpVerificationBindingCompatibility,
} from "./providerHttpRuntimeRegistry";
import type {
  ProviderHttpBindingCompatibilityInput,
  ProviderHttpEndpointEntry,
} from "./providerHttpRuntimeTypes";

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

const enabledExample = (
  exampleId: keyof typeof providerHttpVerificationBindingExamples,
  endpointOverrides: Partial<ProviderHttpBindingCompatibilityInput["endpoint"]> = {},
  bindingOverrides: Partial<ProviderHttpBindingCompatibilityInput["binding"]> = {},
): ProviderHttpBindingCompatibilityInput => ({
  ...providerHttpVerificationBindingExamples[exampleId],
  binding: {
    ...providerHttpVerificationBindingExamples[exampleId].binding,
    ...bindingOverrides,
  },
  enabled: true,
  endpoint: {
    ...providerHttpVerificationBindingExamples[exampleId].endpoint,
    ...endpointOverrides,
  },
});

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

  it("publishes rollout-ready endpoint catalog coverage without live refs", () => {
    const summary = createProviderHttpRuntimeSummary({ profileId: "local-review" });
    const endpointFamilies = summary.endpointRegistry.map((endpoint) => endpoint.providerFamily);
    const enabledFamilies = summary.endpointRegistry
      .filter((endpoint) => endpoint.rolloutStatus === "enabled")
      .map((endpoint) => endpoint.providerFamily);
    const serialized = JSON.stringify(summary);

    expect(endpointFamilies).toEqual(
      expect.arrayContaining([
        "aefinder",
        "aelfscan",
        "ebridge",
        "awaken",
        "forest-schrodinger",
        "tmrwdao",
        "daipp",
        "pay",
        "forecast",
        "portfolio",
      ]),
    );
    expect(enabledFamilies).toEqual(
      expect.arrayContaining([
        "aefinder",
        "aelfscan",
        "ebridge",
        "awaken",
        "forest-schrodinger",
        "tmrwdao",
        "daipp",
        "pay",
        "forecast",
        "portfolio",
      ]),
    );
    expect(summary.endpointRollout).toMatchObject({
      blockedCount: 0,
      disabledCount: 0,
      enabledCount: 11,
      endpointCount: summary.endpointCount,
      valid: true,
    });
    expect(summary.endpointRollout.configuredCategories).toEqual(
      expect.arrayContaining(["indexer", "dapp_api"]),
    );
    expect(summary.endpointRollout.providerFamilies).toEqual(
      expect.arrayContaining(["aefinder", "aelfscan", "awaken", "tmrwdao"]),
    );
    expect(summary.endpointRegistry.every((endpoint) => endpoint.requiredConfigKeys.length > 0))
      .toBe(true);
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("Bearer ");
    expect(serialized).not.toContain("api-key");
    expect(serialized).not.toContain("secret=");
    expect(serialized).not.toContain("password");
  });

  it("keeps social and AI endpoint placeholders deferred", () => {
    const summary = createProviderHttpRuntimeSummary({ profileId: "local-review" });
    const deferredEndpoints = summary.endpointRegistry.filter(
      (endpoint) => endpoint.rolloutStatus === "deferred",
    );
    const socialEndpoint = findProviderHttpEndpointForVerification({
      endpointId: "social-api-verification-status",
      providerGroupId: "social-api-adapters",
      verificationType: "SOCIAL",
    });
    const aiEndpoint = findProviderHttpEndpointForVerification({
      endpointId: "ai-provider-verification-status",
      providerGroupId: "ai-provider-adapters",
      verificationType: "MANUAL",
    });

    expect(summary.endpointRollout.deferredCount).toBeGreaterThanOrEqual(2);
    expect(deferredEndpoints.map((endpoint) => endpoint.category)).toEqual(
      expect.arrayContaining(["social_api", "ai_provider"]),
    );
    expect(
      deferredEndpoints.every((endpoint) => endpoint.supportedVerificationTypes.length > 0),
    ).toBe(true);
    expect(socialEndpoint).toBeUndefined();
    expect(aiEndpoint).toBeUndefined();
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

  it("deeply freezes the cached default endpoint registry snapshot", () => {
    const endpoint = providerHttpEndpointRegistry[0]!;

    expect(Object.isFrozen(providerHttpEndpointRegistry)).toBe(true);
    expect(Object.isFrozen(endpoint)).toBe(true);
    expect(Object.isFrozen(endpoint.headerRefs)).toBe(true);
    expect(Object.isFrozen(endpoint.requiredConfigKeys)).toBe(true);
    expect(Object.isFrozen(endpoint.supportedVerificationTypes)).toBe(true);
  });

  it("publishes provider binding examples as disabled shape-only metadata", () => {
    const examples = providerHttpVerificationBindingExamples;
    const serialized = JSON.stringify(examples);

    expect(Object.keys(examples)).toEqual(
      expect.arrayContaining([
        "aefinder-aelfscan",
        "ebridge",
        "awaken",
        "forest-schrodinger",
        "tmrwdao",
        "daipp",
      ]),
    );
    expect(Object.values(examples).every((input) => input.enabled === false)).toBe(true);
    expect(examples["aefinder-aelfscan"]).toMatchObject({
      binding: {
        id: "aefinder-aelfscan-on-chain",
        verificationType: "ON_CHAIN",
      },
      endpoint: {
        endpointId: "aefinder-aelfscan-indexer-query",
        providerGroupId: "aefinder-aelfscan-indexers",
        requestMappingId: "provider-http-request-map:on-chain-indexer-v1",
        responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
      },
    });
    expect(examples.ebridge).toMatchObject({
      binding: {
        id: "ebridge-dapp-api",
        verificationType: "DAPP_API",
      },
      endpoint: {
        endpointId: "dapp-api-verification-status",
        providerFamily: "ebridge",
        requestMappingId: "provider-http-request-map:dapp-api-status-v1",
        responseMappingId: "provider-http-response-map:dapp-api-status-v1",
      },
    });
    expect(examples["forest-schrodinger"].binding.id).toContain("nft");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("credential");
    expect(serialized).not.toContain("api-key");
    expect(serialized).not.toContain("Bearer ");
  });

  it("enables compatibility only for exact normalizer-supported bindings", () => {
    const onChain = validateProviderHttpVerificationBindingCompatibility(
      enabledExample("aefinder-aelfscan"),
    );
    const dappApi = validateProviderHttpVerificationBindingCompatibility(
      enabledExample("ebridge"),
    );

    expect(onChain).toEqual({
      bindingId: "aefinder-aelfscan-on-chain",
      diagnosticCodes: [],
      diagnosticCount: 0,
      endpointId: "aefinder-aelfscan-indexer-query",
      providerFamily: "aefinder",
      providerGroupId: "aefinder-aelfscan-indexers",
      requestMappingId: "provider-http-request-map:on-chain-indexer-v1",
      responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
      status: "compatible",
      verificationType: "ON_CHAIN",
    });
    expect(dappApi.status).toBe("compatible");
    expect(dappApi.diagnosticCodes).toEqual([]);
    expect("downstreamLiveFlags" in onChain).toBe(false);
    expect("productionReady" in onChain).toBe(false);
    expect("liveHttpCallsAttempted" in onChain).toBe(false);
    expect(Object.isFrozen(onChain)).toBe(true);
    expect(Object.isFrozen(onChain.diagnosticCodes)).toBe(true);
  });

  it("rebuilds custom registry indexes after mutation instead of returning stale compatibility", () => {
    const endpoint = {
      ...findProviderHttpEndpointById("aefinder-aelfscan-indexer-query")!,
      headerRefs: ["header-ref:provider-http-indexer-auth"],
      requiredConfigKeys: ["CAMPAIGN_OS_PROVIDER_HTTP_ENDPOINT_REF"],
      supportedVerificationTypes: ["ON_CHAIN" as const],
    };
    const mutableRegistry: ProviderHttpEndpointEntry[] = [endpoint];
    const input = enabledExample("aefinder-aelfscan");

    expect(validateProviderHttpVerificationBindingCompatibility(
      input,
      mutableRegistry,
    ).status).toBe("compatible");

    mutableRegistry[0] = {
      ...endpoint,
      requestMappingId: "provider-http-request-map:unknown-v1",
      responseMappingId: "provider-http-response-map:unknown-v1",
    };
    const changedMapping = validateProviderHttpVerificationBindingCompatibility(
      input,
      mutableRegistry,
    );

    expect(changedMapping.status).toBe("incompatible");
    expect(changedMapping.diagnosticCodes).toEqual(expect.arrayContaining([
      "PROVIDER_HTTP_BINDING_REQUEST_MAPPING_MISMATCH",
      "PROVIDER_HTTP_BINDING_RESPONSE_MAPPING_MISMATCH",
    ]));

    mutableRegistry[0] = endpoint;
    mutableRegistry.push({ ...endpoint });
    const duplicated = validateProviderHttpVerificationBindingCompatibility(
      input,
      mutableRegistry,
    );

    expect(duplicated.status).toBe("incompatible");
    expect(duplicated.diagnosticCodes).toContain(
      "PROVIDER_HTTP_BINDING_ENDPOINT_DUPLICATED",
    );
  });

  it("accepts the safe structural projection of a task verification config binding", () => {
    const taskVerificationConfigBinding = {
      bodyEnvKey: "CAMPAIGN_OS_TASK_VERIFICATION_BODY",
      credentialEnvKey: "CAMPAIGN_OS_TASK_VERIFICATION_CREDENTIAL",
      endpointEnvKey: "CAMPAIGN_OS_TASK_VERIFICATION_ENDPOINT",
      headerEnvKey: "CAMPAIGN_OS_TASK_VERIFICATION_HEADERS",
      id: "aefinder-aelfscan-on-chain",
      maxAttempts: 3,
      maxResponseBytes: 65_536,
      timeoutMs: 2_500,
      verificationType: "ON_CHAIN" as const,
    };
    const result = validateProviderHttpVerificationBindingCompatibility({
      binding: taskVerificationConfigBinding,
      enabled: true,
      endpoint: providerHttpVerificationBindingExamples["aefinder-aelfscan"].endpoint,
    });

    expect(result).toMatchObject({
      bindingId: "aefinder-aelfscan-on-chain",
      diagnosticCodes: [],
      status: "compatible",
    });
    expect(JSON.stringify(result)).not.toContain("EnvKey");
    expect(JSON.stringify(result)).not.toContain("CAMPAIGN_OS_TASK_VERIFICATION");
  });

  it("fails closed for disabled bindings and unsupported request or response mappings", () => {
    const disabled = validateProviderHttpVerificationBindingCompatibility(
      providerHttpVerificationBindingExamples.awaken,
    );
    const unsupported = validateProviderHttpVerificationBindingCompatibility(
      enabledExample("ebridge", {
        requestMappingId: "provider-http-request-map:unknown-v1",
        responseMappingId: "provider-http-response-map:unknown-v1",
      }),
    );
    const providerSpecific = validateProviderHttpVerificationBindingCompatibility(
      enabledExample("awaken"),
    );

    expect(disabled).toMatchObject({
      diagnosticCodes: ["PROVIDER_HTTP_BINDING_DISABLED"],
      diagnosticCount: 1,
      status: "disabled",
    });
    expect(unsupported.status).toBe("incompatible");
    expect(unsupported.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "PROVIDER_HTTP_BINDING_REQUEST_MAPPING_UNSUPPORTED",
        "PROVIDER_HTTP_BINDING_RESPONSE_MAPPING_UNSUPPORTED",
      ]),
    );
    expect(providerSpecific.status).toBe("incompatible");
    expect(providerSpecific.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "PROVIDER_HTTP_BINDING_REQUEST_MAPPING_UNSUPPORTED",
        "PROVIDER_HTTP_BINDING_RESPONSE_MAPPING_UNSUPPORTED",
      ]),
    );
  });

  it("fails closed for family, group, endpoint, mapping, and verification type mismatches", () => {
    const family = validateProviderHttpVerificationBindingCompatibility(
      enabledExample("aefinder-aelfscan", { providerFamily: "aelfscan" }),
    );
    const group = validateProviderHttpVerificationBindingCompatibility(
      enabledExample("aefinder-aelfscan", { providerGroupId: "dapp-api-adapters" }),
    );
    const endpoint = validateProviderHttpVerificationBindingCompatibility(
      enabledExample("aefinder-aelfscan", { endpointId: "missing-endpoint" }),
    );
    const mappings = validateProviderHttpVerificationBindingCompatibility(
      enabledExample("aefinder-aelfscan", {
        requestMappingId: "provider-http-request-map:dapp-api-status-v1",
        responseMappingId: "provider-http-response-map:dapp-api-status-v1",
      }),
    );
    const verificationType = validateProviderHttpVerificationBindingCompatibility(
      enabledExample("aefinder-aelfscan", {}, { verificationType: "DAPP_API" }),
    );

    expect(family.diagnosticCodes).toContain("PROVIDER_HTTP_BINDING_FAMILY_MISMATCH");
    expect(group.diagnosticCodes).toContain("PROVIDER_HTTP_BINDING_GROUP_MISMATCH");
    expect(endpoint.diagnosticCodes).toContain("PROVIDER_HTTP_BINDING_ENDPOINT_NOT_FOUND");
    expect(mappings.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "PROVIDER_HTTP_BINDING_REQUEST_MAPPING_MISMATCH",
        "PROVIDER_HTTP_BINDING_RESPONSE_MAPPING_MISMATCH",
        "PROVIDER_HTTP_BINDING_TYPE_MAPPING_MISMATCH",
      ]),
    );
    expect(verificationType.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "PROVIDER_HTTP_BINDING_VERIFICATION_TYPE_MISMATCH",
        "PROVIDER_HTTP_BINDING_TYPE_MAPPING_MISMATCH",
      ]),
    );
  });

  it.each(["disabled", "deferred", "blocked"] as const)(
    "fails closed when a compatible endpoint is %s",
    (rolloutStatus) => {
      const endpoint = findProviderHttpEndpointById("aefinder-aelfscan-indexer-query")!;
      const registry: ProviderHttpEndpointEntry[] = [{ ...endpoint, rolloutStatus }];
      const result = validateProviderHttpVerificationBindingCompatibility(
        enabledExample("aefinder-aelfscan"),
        registry,
      );

      expect(result.status).toBe("incompatible");
      expect(result.diagnosticCodes).toContain(
        `PROVIDER_HTTP_BINDING_ENDPOINT_${rolloutStatus.toUpperCase()}`,
      );
    },
  );

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
