import { describe, expect, it } from "vitest";
import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import { planProviderHttpRequest, type ProviderHttpVerificationRequestInput } from "./providerHttpRequestPlanner";
import {
  normalizeProviderHttpResponse,
  type ProviderHttpResponseMatcher,
} from "./providerHttpResponseNormalizer";

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

const runtime = createProviderHttpRuntimeSummary({
  env,
  profileId: "production-required",
  transportProvided: true,
});

const request: ProviderHttpVerificationRequestInput = {
  attempt: { count: 1, maxAttempts: 3 },
  campaignId: "campaign-ref:provider-http",
  endpointId: "aefinder-aelfscan-indexer-query",
  evidenceHash: "sha256:provider-evidence",
  evidenceRef: "evidence-ref:task-1",
  idempotencyRef: "idem-ref:campaign-task-wallet",
  leaseRef: "lease-ref:worker-task",
  providerGroupId: "aefinder-aelfscan-indexers",
  taskId: "task-ref:on-chain-1",
  traceId: "trace-provider-http-1",
  verificationType: "ON_CHAIN",
};

const plan = (override: Partial<ProviderHttpVerificationRequestInput> = {}) => {
  const result = planProviderHttpRequest({ ...request, ...override }, runtime);

  if (!result.ok) {
    throw new Error("test fixture should produce a safe provider HTTP plan");
  }

  return result.plan;
};

const positiveMatcher: ProviderHttpResponseMatcher = ({ body, transportExecuted }) => ({
  diagnosticCodes: ["PROVIDER_MATCH_POSITIVE"],
  evidenceHash: typeof body === "object" && body !== null
    ? String((body as Record<string, unknown>).evidenceHash ?? "")
    : undefined,
  evidenceRef: typeof body === "object" && body !== null
    ? String((body as Record<string, unknown>).evidenceRef ?? "")
    : undefined,
  outcome: "completed",
  positiveMatch: transportExecuted,
});

describe("provider HTTP response normalizer", () => {
  it("normalizes completed 2xx responses with evidence hash and ref", () => {
    const result = normalizeProviderHttpResponse(
      plan(),
      {
        body: {
          evidenceHash: "a".repeat(64),
          evidenceRef: "evidence-ref:task-1",
          status: "completed",
        },
        durationMs: 11,
        statusCode: 200,
        timedOut: false,
      },
      {},
      positiveMatcher,
    );

    expect(result).toMatchObject({
      evidenceHash: "a".repeat(64),
      evidenceRef: "evidence-ref:task-1",
      httpStatusCode: 200,
      outcome: "completed",
      retryPosture: "none",
      transportExecuted: true,
    });
  });

  it("never treats a successful HTTP status as completed without a positive matcher", () => {
    const result = normalizeProviderHttpResponse(plan(), {
      body: {
        evidenceHash: "a".repeat(64),
        evidenceRef: "evidence-ref:task-1",
        status: "completed",
      },
      durationMs: 11,
      statusCode: 200,
      timedOut: false,
    });

    expect(result).toMatchObject({
      diagnosticCodes: ["http_matcher_missing"],
      outcome: "manual_review",
      positiveMatch: false,
    });
    expect(result).not.toHaveProperty("evidenceHash");
    expect(result).not.toHaveProperty("evidenceRef");
  });

  it("fails closed for an unsupported mapping before accepting a pending 2xx", () => {
    const result = normalizeProviderHttpResponse(
      { ...plan(), responseMappingId: "provider-http-response-map:unsupported-v1" },
      {
        body: { status: "pending" },
        durationMs: 11,
        statusCode: 202,
        timedOut: false,
      },
    );

    expect(result).toMatchObject({
      diagnosticCodes: ["http_unsupported_response_mapping"],
      outcome: "blocked",
      positiveMatch: false,
    });
  });

  it("maps pending 202 and missing evidence 2xx deterministically", () => {
    const pending = normalizeProviderHttpResponse(plan(), {
      body: { status: "pending" },
      durationMs: 10,
      statusCode: 202,
      timedOut: false,
    });
    const missingEvidence = normalizeProviderHttpResponse(
      plan({ evidenceHash: undefined, evidenceRef: undefined }),
      {
        body: { status: "completed" },
        durationMs: 10,
        statusCode: 200,
        timedOut: false,
      },
      {},
      () => ({
        diagnosticCodes: ["PROVIDER_MATCH_POSITIVE"],
        outcome: "completed",
        positiveMatch: true,
      }),
    );

    expect(pending).toMatchObject({ outcome: "pending", retryPosture: "none" });
    expect(missingEvidence).toMatchObject({
      diagnosticCodes: ["http_missing_evidence"],
      outcome: "manual_review",
      retryPosture: "blocked",
    });
  });

  it("maps auth, not found, conflict, retryable, and exhausted failures", () => {
    const auth = normalizeProviderHttpResponse(plan(), { durationMs: 9, statusCode: 401, timedOut: false });
    const notFound = normalizeProviderHttpResponse(plan(), { durationMs: 9, statusCode: 404, timedOut: false });
    const conflict = normalizeProviderHttpResponse(plan(), { durationMs: 9, statusCode: 409, timedOut: false });
    const rateLimited = normalizeProviderHttpResponse(plan(), { durationMs: 9, statusCode: 429, timedOut: false });
    const exhausted = normalizeProviderHttpResponse(
      plan({ attempt: { count: 3, maxAttempts: 3 }, traceId: "trace-exhausted" }),
      { durationMs: 9, statusCode: 500, timedOut: false },
    );

    expect(auth).toMatchObject({ diagnosticCodes: ["http_auth_or_config_failure"], outcome: "blocked" });
    expect(notFound).toMatchObject({ diagnosticCodes: ["http_non_retryable_failure"], outcome: "failed" });
    expect(conflict).toMatchObject({
      diagnosticCodes: ["http_conflict"],
      idempotencyDecision: "duplicate_drop",
      leaseDecision: "conflict",
      outcome: "blocked",
    });
    expect(rateLimited).toMatchObject({ outcome: "pending", retryPosture: "not_retried" });
    expect(exhausted).toMatchObject({
      diagnosticCodes: ["http_provider_unavailable"],
      outcome: "manual_review",
      retryPosture: "exhausted",
    });
  });

  it.each([
    [401, "http_auth_or_config_failure", "blocked"],
    [404, "http_non_retryable_failure", "failed"],
    [409, "http_conflict", "blocked"],
    [429, "http_rate_limited", "pending"],
    [503, "http_provider_unavailable", "pending"],
  ] as const)("does not let a pending body mask HTTP %s", (statusCode, diagnosticCode, outcome) => {
    const result = normalizeProviderHttpResponse(plan(), {
      body: { status: "pending" },
      durationMs: 9,
      statusCode,
      timedOut: false,
    });

    expect(result).toMatchObject({ diagnosticCodes: [diagnosticCode], outcome });
  });

  it.each(["blocked", "manual_review", "pending"] as const)(
    "applies %s degradation to timeout, rate limit, unavailable, and missing evidence",
    (degradationOutcome) => {
      const policy = { degradationOutcome };
      const timeout = normalizeProviderHttpResponse(
        plan(),
        { durationMs: 2_500, timedOut: true },
        policy,
      );
      const rateLimited = normalizeProviderHttpResponse(
        plan(),
        { body: { status: "pending" }, durationMs: 9, statusCode: 429, timedOut: false },
        policy,
      );
      const unavailable = normalizeProviderHttpResponse(
        plan(),
        { body: { status: "pending" }, durationMs: 9, statusCode: 503, timedOut: false },
        policy,
      );
      const missingEvidence = normalizeProviderHttpResponse(
        plan(),
        {
          body: { status: "completed", verified: true },
          durationMs: 9,
          statusCode: 200,
          timedOut: false,
        },
        policy,
        () => ({
          diagnosticCodes: ["PROVIDER_MATCH_POSITIVE"],
          outcome: "completed",
          positiveMatch: true,
        }),
      );

      expect([timeout, rateLimited, unavailable, missingEvidence].map(({ outcome }) => outcome))
        .toEqual([degradationOutcome, degradationOutcome, degradationOutcome, degradationOutcome]);
      expect(missingEvidence.diagnosticCodes).toEqual(["http_missing_evidence"]);
    },
  );

  it("maps timeout, aborted, malformed, unsupported mapping, and unsafe body without leaks", () => {
    const timeout = normalizeProviderHttpResponse(plan(), { durationMs: 2500, statusCode: 408, timedOut: true });
    const malformed = normalizeProviderHttpResponse(plan(), { body: "not-json", durationMs: 10, statusCode: 200, timedOut: false });
    const unsupportedMapping = normalizeProviderHttpResponse(
      { ...plan(), responseMappingId: "provider-http-response-map:unsupported-v1" },
      { body: { evidenceHash: "sha256:provider-evidence", evidenceRef: "evidence-ref:task-1" }, durationMs: 10, statusCode: 200, timedOut: false },
    );
    const unsafe = normalizeProviderHttpResponse(plan(), {
      body: {
        rawResponseBody: "{\"walletAddress\":\"ELF_FAKE_SECRET_SENTINEL\",\"providerResponse\":true}",
        status: "completed",
      },
      durationMs: 10,
      statusCode: 200,
      timedOut: false,
    });
    const serialized = JSON.stringify(unsafe);

    expect(timeout).toMatchObject({ diagnosticCodes: ["http_timeout"], outcome: "pending" });
    expect(malformed).toMatchObject({ diagnosticCodes: ["http_malformed_response"], outcome: "manual_review" });
    expect(unsupportedMapping).toMatchObject({
      diagnosticCodes: ["http_unsupported_response_mapping"],
      outcome: "blocked",
    });
    expect(unsafe).toMatchObject({ diagnosticCodes: ["http_unsafe_response_material"], outcome: "manual_review" });
    expect(serialized).not.toContain("ELF_FAKE_SECRET_SENTINEL");
    expect(serialized).not.toContain("providerResponse");
  });
});
