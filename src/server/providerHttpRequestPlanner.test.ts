import { describe, expect, it } from "vitest";
import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import {
  createCanonicalProviderHttpRequestDigest,
  planProviderHttpRequest,
  type ProviderHttpVerificationRequestInput,
} from "./providerHttpRequestPlanner";
import type { ProviderEndpointRolloutStatus, ProviderHttpEndpointEntry } from "./providerHttpRuntimeTypes";
import { executeProviderHttpTransport, type ProviderHttpTransport } from "./providerHttpTransport";

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

const activatedRuntime = createProviderHttpRuntimeSummary({
  env: productionReadyProviderHttpEnv,
  profileId: "production-required",
  transportProvided: true,
});

const safeRequest: ProviderHttpVerificationRequestInput = {
  attempt: {
    count: 1,
    maxAttempts: 3,
  },
  bodyHash: "sha256:provider-http-request",
  bodyRef: "evidence-ref:provider-http-request-body",
  campaignId: "campaign-ref:provider-http",
  endpointId: "aefinder-aelfscan-indexer-query",
  evidenceHash: "sha256:provider-evidence",
  evidenceRef: "evidence-ref:task-1",
  idempotencyRef: "idem-ref:campaign-task-wallet",
  leaseRef: "lease-ref:worker-task",
  operatorContextRefs: {
    source: "unit-test",
  },
  providerGroupId: "aefinder-aelfscan-indexers",
  requestMaterialRef: `request-ref:${"c".repeat(64)}`,
  strategyId: "on-chain-indexer-v1",
  taskId: "task-ref:on-chain-1",
  traceId: "trace-provider-http-1",
  verificationType: "ON_CHAIN",
  walletAccountRef: "account-ref:wallet-1",
  walletSessionRef: "session-ref:wallet-1",
};

const endpointFixture = (
  overrides: Partial<ProviderHttpEndpointEntry> = {},
): ProviderHttpEndpointEntry => ({
  ...activatedRuntime.endpointRegistry.find(
    (endpoint) => endpoint.endpointId === "aefinder-aelfscan-indexer-query",
  )!,
  ...overrides,
});

const runtimeWithEndpoint = (endpoint: ProviderHttpEndpointEntry) =>
  createProviderHttpRuntimeSummary({
    endpointRegistry: [endpoint],
    env: productionReadyProviderHttpEnv,
    profileId: "production-required",
    transportProvided: true,
  });

const planWithEndpoint = (endpoint: ProviderHttpEndpointEntry) =>
  planProviderHttpRequest(
    {
      ...safeRequest,
      endpointId: endpoint.endpointId,
      providerGroupId: endpoint.providerGroupId,
      verificationType: endpoint.supportedVerificationTypes[0],
    },
    runtimeWithEndpoint(endpoint),
  );

const expectRolloutStatusToBlock = (
  rolloutStatus: Exclude<ProviderEndpointRolloutStatus, "enabled">,
  code: "endpoint_blocked" | "endpoint_deferred" | "endpoint_disabled",
) => {
  const result = planWithEndpoint(endpointFixture({ rolloutStatus }));

  expect(result.ok).toBe(false);
  expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
    expect.arrayContaining([code]),
  );
};

describe("provider HTTP request planner", () => {
  it("builds a safe request plan from refs, hashes, and registry metadata", () => {
    const startedAt = performance.now();
    const result = planProviderHttpRequest(safeRequest, activatedRuntime);
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(150);
    expect(result.ok).toBe(true);
    expect(result.plan).toMatchObject({
      attempt: {
        count: 1,
        maxAttempts: 3,
      },
      bodyHash: "sha256:provider-http-request",
      campaignId: "campaign-ref:provider-http",
      endpointId: "aefinder-aelfscan-indexer-query",
      headerRefs: ["header-ref:provider-http-indexer-auth", "header-ref:provider-http-trace"],
      idempotencyRef: "idem-ref:campaign-task-wallet",
      leaseRef: "lease-ref:worker-task",
      method: "POST",
      providerGroupId: "aefinder-aelfscan-indexers",
      requestMaterialRef: `request-ref:${"c".repeat(64)}`,
      strategyId: "on-chain-indexer-v1",
      taskId: "task-ref:on-chain-1",
      timeoutMs: 2500,
      traceId: "trace-provider-http-1",
      urlRef: "provider.endpoint.aefinder_aelfscan.indexer.url",
      verificationType: "ON_CHAIN",
    });
    expect(JSON.stringify(result.plan)).not.toContain("http://");
    expect(JSON.stringify(result.plan)).not.toContain("https://");
    expect(JSON.stringify(result.plan)).not.toContain("Bearer ");
  });

  it("rejects unknown endpoints and verification mismatches", () => {
    const unknownEndpoint = planProviderHttpRequest(
      { ...safeRequest, endpointId: "missing-endpoint" },
      activatedRuntime,
    );
    const mismatchedVerification = planProviderHttpRequest(
      { ...safeRequest, verificationType: "DAPP_API" },
      activatedRuntime,
    );
    const mismatchedGroup = planProviderHttpRequest(
      { ...safeRequest, providerGroupId: "dapp-api-adapters" },
      activatedRuntime,
    );

    expect(unknownEndpoint).toMatchObject({
      diagnostics: [expect.objectContaining({ code: "unknown_endpoint" })],
      ok: false,
    });
    expect(mismatchedVerification).toMatchObject({
      diagnostics: [expect.objectContaining({ code: "verification_type_mismatch" })],
      ok: false,
    });
    expect(mismatchedGroup.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["provider_group_mismatch", "verification_type_mismatch"]),
    );
  });

  it("keeps deferred social and AI placeholders out of request planning", () => {
    const socialPlaceholder = planProviderHttpRequest(
      {
        ...safeRequest,
        endpointId: "social-api-verification-status",
        providerGroupId: "social-api-adapters",
        verificationType: "SOCIAL",
      },
      activatedRuntime,
    );
    const aiPlaceholder = planProviderHttpRequest(
      {
        ...safeRequest,
        endpointId: "ai-provider-verification-status",
        providerGroupId: "ai-provider-adapters",
        verificationType: "MANUAL",
      },
      activatedRuntime,
    );

    expect(socialPlaceholder.ok).toBe(false);
    expect(aiPlaceholder.ok).toBe(false);
    expect(socialPlaceholder.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["endpoint_deferred"]),
    );
    expect(aiPlaceholder.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["endpoint_deferred"]),
    );
  });

  it("rejects disabled, deferred, and blocked endpoint rollout statuses", () => {
    expectRolloutStatusToBlock("disabled", "endpoint_disabled");
    expectRolloutStatusToBlock("deferred", "endpoint_deferred");
    expectRolloutStatusToBlock("blocked", "endpoint_blocked");
  });

  it("rejects missing endpoint rollout config refs", () => {
    const result = planWithEndpoint(endpointFixture({ requiredConfigKeys: [""] }));

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["endpoint_required_config_missing"]),
    );
  });

  it("rejects unsafe endpoint rollout metadata with redacted diagnostics", () => {
    const result = planWithEndpoint(
      endpointFixture({
        credentialRef: "credential=fake-credential-sentinel",
        headerRefs: ["Bearer fake-live-token-sentinel", "header-ref:provider-http-trace"],
        urlTemplateRef: "https://fake-user:fake-password-sentinel@indexer.invalid/raw.csv?token=fake-query-sentinel",
      }),
    );
    const serialized = JSON.stringify(result);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["endpoint_unsafe_rollout_metadata"]),
    );
    expect(serialized).not.toContain("fake-credential-sentinel");
    expect(serialized).not.toContain("fake-live-token-sentinel");
    expect(serialized).not.toContain("fake-password-sentinel");
    expect(serialized).not.toContain("fake-query-sentinel");
  });

  it("rejects disabled or blocked runtime before planning", () => {
    const disabledRuntime = createProviderHttpRuntimeSummary({ profileId: "local-review" });
    const blockedRuntime = createProviderHttpRuntimeSummary({ profileId: "production-required" });

    expect(planProviderHttpRequest(safeRequest, disabledRuntime)).toMatchObject({
      diagnostics: [expect.objectContaining({ code: "runtime_not_activated" })],
      ok: false,
    });
    expect(planProviderHttpRequest(safeRequest, blockedRuntime)).toMatchObject({
      diagnostics: [expect.objectContaining({ code: "runtime_not_activated" })],
      ok: false,
    });
  });

  it("rejects missing trace, idempotency, and lease refs", () => {
    const result = planProviderHttpRequest(
      {
        ...safeRequest,
        idempotencyRef: "",
        leaseRef: "",
        traceId: "",
      },
      activatedRuntime,
    );

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "missing_trace_id",
        "missing_idempotency_ref",
        "missing_lease_ref",
      ]),
    );
  });

  it("requires a canonical request material ref for strategy plans", () => {
    const missing = planProviderHttpRequest(
      { ...safeRequest, requestMaterialRef: undefined },
      activatedRuntime,
    );
    const malformed = planProviderHttpRequest(
      { ...safeRequest, requestMaterialRef: "request-ref:not-a-digest" },
      activatedRuntime,
    );

    expect(missing.diagnostics.map(({ code }) => code)).toContain(
      "missing_request_material_ref",
    );
    expect(malformed.diagnostics.map(({ code }) => code)).toContain(
      "invalid_request_material_ref",
    );
  });

  it("rejects unsafe request material before producing an executable plan", () => {
    const result = planProviderHttpRequest(
      {
        ...safeRequest,
        authorization: "Bearer fake-live-token-sentinel",
        evidenceRef: "https://storage.invalid/raw.csv?X-Amz-Signature=fake-signature-sentinel",
        idempotencyRef: "idem-token=fake-wallet-sentinel",
        leaseRef: "lease-token=fake-worker-sentinel",
        objectKey: "tenant/raw/object-key.csv",
        operatorContextRefs: {
          rawPayload: "{\"walletAddress\":\"ELF_FAKE_SECRET_SENTINEL\",\"providerPayload\":true}",
        },
        rawRequestBody: "{\"walletAddress\":\"ELF_FAKE_SECRET_SENTINEL\",\"providerPayload\":true}",
        rawResponseBody: "{\"score\":99,\"providerResponse\":true}",
        stack: "Error: provider failed\n    at secret.ts:1:1",
        walletPrivateKey: "ELF_PRIVATE_WALLET",
      },
      activatedRuntime,
    );
    const serialized = JSON.stringify(result);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["unsafe_request_material"]),
    );
    expect(serialized).not.toContain("ELF_FAKE_SECRET_SENTINEL");
    expect(serialized).not.toContain("fake-worker-sentinel");
    expect(serialized).not.toContain("fake-signature-sentinel");
    expect(serialized).not.toContain("fake-live-token-sentinel");
  });

  it("does not call transport when request planning blocks", async () => {
    let calls = 0;
    const blockedPlan = planProviderHttpRequest(
      { ...safeRequest, traceId: "" },
      activatedRuntime,
    );
    const transport: ProviderHttpTransport = () => {
      calls += 1;
      return {
        durationMs: 1,
        statusCode: 200,
        timedOut: false,
      };
    };

    if (blockedPlan.ok) {
      await executeProviderHttpTransport(blockedPlan.plan, transport);
    }

    expect(blockedPlan.ok).toBe(false);
    expect(calls).toBe(0);
  });

  it("creates a stable canonical request digest without resolved material", () => {
    const first = createCanonicalProviderHttpRequestDigest({
      endpointId: "aefinder-aelfscan-indexer-query",
      operatorContextRefs: {
        rule: "evidence-ref:rule-a",
        subject: "account-ref:subject-a",
      },
      taskId: "task-ref:on-chain-1",
      traceId: "trace-digest",
    });
    const second = createCanonicalProviderHttpRequestDigest({
      traceId: "trace-digest",
      taskId: "task-ref:on-chain-1",
      operatorContextRefs: {
        subject: "account-ref:subject-a",
        rule: "evidence-ref:rule-a",
      },
      endpointId: "aefinder-aelfscan-indexer-query",
    });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify({ digest: first })).not.toContain("http://");
    expect(JSON.stringify({ digest: first })).not.toContain("Bearer ");
  });
});
