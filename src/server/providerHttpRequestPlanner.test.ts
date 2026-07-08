import { describe, expect, it } from "vitest";
import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import { planProviderHttpRequest, type ProviderHttpVerificationRequestInput } from "./providerHttpRequestPlanner";
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
  taskId: "task-ref:on-chain-1",
  traceId: "trace-provider-http-1",
  verificationType: "ON_CHAIN",
  walletAccountRef: "account-ref:wallet-1",
  walletSessionRef: "session-ref:wallet-1",
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

    expect(socialPlaceholder).toMatchObject({
      diagnostics: [expect.objectContaining({ code: "verification_type_mismatch" })],
      ok: false,
    });
    expect(aiPlaceholder).toMatchObject({
      diagnostics: [expect.objectContaining({ code: "verification_type_mismatch" })],
      ok: false,
    });
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

  it("rejects unsafe request material before producing an executable plan", () => {
    const result = planProviderHttpRequest(
      {
        ...safeRequest,
        authorization: "Bearer live-token",
        evidenceRef: "https://storage.example/raw.csv?X-Amz-Signature=abc123",
        idempotencyRef: "idem-token=secret-wallet",
        leaseRef: "lease-token=secret-worker",
        objectKey: "tenant/raw/object-key.csv",
        operatorContextRefs: {
          rawPayload: "{\"walletAddress\":\"ELF_SECRET\",\"providerPayload\":true}",
        },
        rawRequestBody: "{\"walletAddress\":\"ELF_SECRET\",\"providerPayload\":true}",
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
    expect(serialized).not.toContain("ELF_SECRET");
    expect(serialized).not.toContain("secret-worker");
    expect(serialized).not.toContain("abc123");
    expect(serialized).not.toContain("live-token");
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
});
