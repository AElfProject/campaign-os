import { describe, expect, it } from "vitest";
import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import type { ProviderHttpVerificationRequestInput } from "./providerHttpRequestPlanner";
import { executeProviderHttpRequest } from "./providerHttpClientRuntime";
import type { ProviderHttpTransport } from "./providerHttpTransport";

const env = {
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
};

const activatedRuntime = createProviderHttpRuntimeSummary({
  env,
  profileId: "production-required",
  transportProvided: true,
});

const request: ProviderHttpVerificationRequestInput = {
  attempt: { count: 1, maxAttempts: 3 },
  campaignId: "campaign-ref:provider-http",
  endpointId: "aefinder-aelfscan-indexer-query",
  idempotencyRef: "idem-ref:campaign-task-wallet",
  leaseRef: "lease-ref:worker-task",
  providerGroupId: "aefinder-aelfscan-indexers",
  taskId: "task-ref:on-chain-1",
  traceId: "trace-provider-http-1",
  verificationType: "ON_CHAIN",
};

const successTransport: ProviderHttpTransport = () => ({
  body: {
    evidenceHash: "a".repeat(64),
    evidenceRef: "evidence-ref:task-1",
    status: "completed",
  },
  durationMs: 12,
  statusCode: 200,
  timedOut: false,
});

const positiveMatcher = () => ({
  diagnosticCodes: ["PROVIDER_MATCH_POSITIVE"],
  evidenceHash: "a".repeat(64),
  evidenceRef: "evidence-ref:task-1",
  outcome: "completed" as const,
  positiveMatch: true,
});

describe("provider HTTP client runtime", () => {
  it("does not execute transport for disabled or blocked default runtimes", async () => {
    let calls = 0;
    const transport: ProviderHttpTransport = () => {
      calls += 1;
      return { durationMs: 1, statusCode: 200, timedOut: false };
    };
    const disabled = await executeProviderHttpRequest(request, {
      runtime: createProviderHttpRuntimeSummary({ profileId: "local-review" }),
      transport,
    });
    const blocked = await executeProviderHttpRequest(request, {
      runtime: createProviderHttpRuntimeSummary({ profileId: "production-required" }),
      transport,
    });

    expect(calls).toBe(0);
    expect(disabled).toMatchObject({ outcome: "blocked", transportExecuted: false });
    expect(blocked).toMatchObject({ outcome: "blocked", transportExecuted: false });
  });

  it("executes safe activated requests through injected transport", async () => {
    const result = await executeProviderHttpRequest(request, {
      matcher: positiveMatcher,
      runtime: activatedRuntime,
      transport: successTransport,
    });

    expect(result).toMatchObject({
      evidenceHash: "a".repeat(64),
      evidenceRef: "evidence-ref:task-1",
      liveHttpCallsAttempted: true,
      outcome: "completed",
      transportExecuted: true,
    });
    expect(Object.values(result.downstreamLiveFlags).every((value) => value === false)).toBe(true);
  });

  it("handles timeout, non-2xx, malformed body, and missing transport deterministically", async () => {
    const timeout = await executeProviderHttpRequest(request, {
      runtime: activatedRuntime,
      transport: () => ({ durationMs: 2500, statusCode: 408, timedOut: true }),
    });
    const auth = await executeProviderHttpRequest(request, {
      runtime: activatedRuntime,
      transport: () => ({ durationMs: 10, statusCode: 403, timedOut: false }),
    });
    const malformed = await executeProviderHttpRequest(request, {
      runtime: activatedRuntime,
      transport: () => ({ body: "not-json", durationMs: 10, statusCode: 200, timedOut: false }),
    });
    const missingTransport = await executeProviderHttpRequest(request, {
      runtime: activatedRuntime,
    });

    expect(timeout).toMatchObject({ outcome: "pending", retryPosture: "not_retried" });
    expect(auth).toMatchObject({ diagnosticCodes: ["http_auth_or_config_failure"], outcome: "blocked" });
    expect(malformed).toMatchObject({ diagnosticCodes: ["http_malformed_response"], outcome: "manual_review" });
    expect(missingTransport).toMatchObject({
      diagnosticCodes: ["transport_missing"],
      liveHttpCallsAttempted: false,
      transportExecuted: false,
    });
  });

  it("prevents duplicate idempotency and lease conflicts from executing transport", async () => {
    let calls = 0;
    const transport: ProviderHttpTransport = () => {
      calls += 1;
      return { durationMs: 1, statusCode: 200, timedOut: false };
    };
    const duplicate = await executeProviderHttpRequest(request, {
      idempotency: { decision: "duplicate_drop" },
      runtime: activatedRuntime,
      transport,
    });
    const existing = await executeProviderHttpRequest(request, {
      idempotency: {
        decision: "existing_completion",
        evidenceHash: "a".repeat(64),
        evidenceRef: "evidence-ref:task-1",
      },
      runtime: activatedRuntime,
      transport,
    });
    const leaseConflict = await executeProviderHttpRequest(request, {
      lease: { decision: "conflict" },
      runtime: activatedRuntime,
      transport,
    });

    expect(calls).toBe(0);
    expect(duplicate).toMatchObject({ idempotencyDecision: "duplicate_drop", outcome: "blocked" });
    expect(existing).toMatchObject({
      idempotencyDecision: "existing_completion",
      outcome: "manual_review",
      transportExecuted: false,
    });
    expect(leaseConflict).toMatchObject({
      leaseDecision: "conflict",
      outcome: "blocked",
      transportExecuted: false,
    });
  });

  it("redacts unsafe responses and thrown transport errors", async () => {
    const unsafe = await executeProviderHttpRequest(request, {
      runtime: activatedRuntime,
      transport: () => ({
        body: {
          rawResponseBody: "{\"walletAddress\":\"ELF_FAKE_SECRET_SENTINEL\",\"providerResponse\":true}",
          status: "completed",
        },
        durationMs: 10,
        statusCode: 200,
        timedOut: false,
      }),
    });
    const thrown = await executeProviderHttpRequest(request, {
      runtime: activatedRuntime,
      transport: () => {
        throw new Error("provider token=fake-secret-sentinel payload={\"walletAddress\":\"ELF_FAKE_SECRET_SENTINEL\"}");
      },
    });
    const serialized = JSON.stringify({ thrown, unsafe });

    expect(unsafe).toMatchObject({ diagnosticCodes: ["http_unsafe_response_material"], outcome: "manual_review" });
    expect(thrown).toMatchObject({
      diagnosticCodes: ["transport_thrown_error"],
      liveHttpCallsAttempted: true,
      transportExecuted: true,
    });
    expect(serialized).not.toContain("ELF_FAKE_SECRET_SENTINEL");
    expect(serialized).not.toContain("token=fake-secret-sentinel");
    expect(serialized).not.toContain("providerResponse");
  });
});
