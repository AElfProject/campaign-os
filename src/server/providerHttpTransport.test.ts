import { describe, expect, it } from "vitest";
import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import { planProviderHttpRequest, type ProviderHttpVerificationRequestInput } from "./providerHttpRequestPlanner";
import {
  createMissingProviderHttpTransportDiagnostic,
  executeProviderHttpTransport,
  type ProviderHttpTransport,
} from "./providerHttpTransport";

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

const runtime = createProviderHttpRuntimeSummary({
  env: productionReadyProviderHttpEnv,
  profileId: "production-required",
  transportProvided: true,
});

const request: ProviderHttpVerificationRequestInput = {
  attempt: {
    count: 1,
    maxAttempts: 3,
  },
  campaignId: "campaign-ref:provider-http",
  endpointId: "dapp-api-verification-status",
  evidenceHash: "sha256:provider-evidence",
  idempotencyRef: "idem-ref:campaign-task-wallet",
  leaseRef: "lease-ref:worker-task",
  providerGroupId: "dapp-api-adapters",
  taskId: "task-ref:dapp-1",
  traceId: "trace-provider-http-dapp",
  verificationType: "DAPP_API",
  walletAccountRef: "account-ref:wallet-1",
  walletSessionRef: "session-ref:wallet-1",
};

const plan = () => {
  const result = planProviderHttpRequest(request, runtime);

  if (!result.ok) {
    throw new Error("test fixture should produce a safe provider HTTP plan");
  }

  return result.plan;
};

describe("provider HTTP transport seam", () => {
  it("reports missing transport without invoking network defaults", async () => {
    const result = await executeProviderHttpTransport(plan());

    expect(createMissingProviderHttpTransportDiagnostic()).toMatchObject({
      code: "transport_missing",
      severity: "blocker",
    });
    expect(result).toMatchObject({
      diagnostics: [expect.objectContaining({ code: "transport_missing" })],
      ok: false,
    });
  });

  it("invokes an injected fake transport only with a safe planned request", async () => {
    const planned = plan();
    const startedAt = performance.now();
    let calls = 0;
    const successTransport: ProviderHttpTransport = (transportRequest, context) => {
      calls += 1;
      expect(transportRequest).toMatchObject({
        endpointId: "dapp-api-verification-status",
        method: "GET",
        traceId: "trace-provider-http-dapp",
        urlRef: "provider.endpoint.dapp_api.verification_status.url",
      });
      expect(context.traceId).toBe("trace-provider-http-dapp");

      return {
        body: {
          evidenceHash: "sha256:provider-evidence",
          status: "completed",
        },
        durationMs: 12,
        headers: {
          "x-provider-status": "ok",
        },
        statusCode: 200,
        timedOut: false,
      };
    };

    const result = await executeProviderHttpTransport(planned, successTransport);
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(150);
    expect(calls).toBe(1);
    expect(result).toMatchObject({
      ok: true,
      result: {
        durationMs: 12,
        statusCode: 200,
        timedOut: false,
      },
    });
    expect(result.ok && result.result).not.toHaveProperty("headers");
    expect(JSON.stringify(planned)).not.toContain("https://");
    expect(JSON.stringify(planned)).not.toContain("Bearer ");
  });

  it("supports deterministic timeout transport results", async () => {
    const timeoutTransport: ProviderHttpTransport = () => ({
      durationMs: 2500,
      statusCode: 408,
      timedOut: true,
    });

    await expect(executeProviderHttpTransport(plan(), timeoutTransport)).resolves.toMatchObject({
      ok: true,
      result: {
        statusCode: 408,
        timedOut: true,
      },
    });
  });

  it("redacts thrown transport errors", async () => {
    const throwingTransport: ProviderHttpTransport = () => {
      throw new Error("provider token=fake-secret-sentinel payload={\"walletAddress\":\"ELF_FAKE_SECRET_SENTINEL\"}");
    };
    const result = await executeProviderHttpTransport(plan(), throwingTransport);
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      diagnostics: [expect.objectContaining({
        code: "transport_thrown_error",
        redactedValue: "[REDACTED:ERROR]",
      })],
      ok: false,
      transportExecuted: true,
    });
    expect(serialized).not.toContain("ELF_FAKE_SECRET_SENTINEL");
    expect(serialized).not.toContain("token=fake-secret-sentinel");
  });

  it("forwards caller/runtime signals and explicit attempt timing", async () => {
    const caller = new AbortController();
    const runtimeSignal = new AbortController();
    let receivedContext: Parameters<ProviderHttpTransport>[1] | undefined;
    const transport: ProviderHttpTransport = (_request, context) => {
      receivedContext = context;
      return { durationMs: 1, statusCode: 202, timedOut: false };
    };

    const result = await executeProviderHttpTransport(plan(), transport, {
      attemptStartedAtMs: 42,
      runtimeSignal: runtimeSignal.signal,
      signal: caller.signal,
    });

    expect(result.ok).toBe(true);
    expect(receivedContext).toMatchObject({
      attemptStartedAtMs: 42,
      runtimeSignal: runtimeSignal.signal,
      signal: caller.signal,
      traceId: "trace-provider-http-dapp",
    });
  });

  it("rejects malformed or unknown injected diagnostics without exposing their values", async () => {
    const result = await executeProviderHttpTransport(plan(), () => ({
      diagnostic: {
        code: "unknown_failure",
        message: "fake-token-sentinel raw failure",
        traceId: "trace-provider-http-dapp",
      },
      durationMs: 1,
      timedOut: false,
    } as never));

    expect(result).toMatchObject({
      diagnostics: [expect.objectContaining({ code: "transport_result_invalid" })],
      ok: false,
      transportExecuted: true,
    });
    expect(JSON.stringify(result)).not.toContain("fake-token-sentinel");
  });
});
