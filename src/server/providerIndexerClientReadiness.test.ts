import { describe, expect, it } from "vitest";
import {
  createProviderIndexerClientReadiness,
  evaluateProviderVerificationRequest,
  providerClientDownstreamLiveFlags,
  providerClientProductionPreconditions,
  redactProviderClientValue,
  type ProviderClient,
  type ProviderClientDiagnosticCode,
  type ProviderVerificationRequest,
} from "./providerIndexerClientReadiness";

const productionReadyProviderEnv = {
  CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT: "explicitly-enabled",
  CAMPAIGN_OS_PROVIDER_REGISTRY_URL: "provider-registry-ref:campaign-os",
  CAMPAIGN_OS_PROVIDER_ENDPOINT_REF: "endpoint-ref:aefinder-aelfscan",
  CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF: "credential-ref:provider-clients",
  CAMPAIGN_OS_PROVIDER_CLIENT_SEAM: "client-seam-ref:provider-indexer",
  CAMPAIGN_OS_PROVIDER_TIMEOUT_POLICY: "timeout-policy:2500ms",
  CAMPAIGN_OS_PROVIDER_RETRY_POLICY: "retry-policy:provider-backoff",
  CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_POLICY: "circuit-breaker:fail-closed",
  CAMPAIGN_OS_PROVIDER_DEGRADATION_POLICY: "degradation:manual-review",
  CAMPAIGN_OS_PROVIDER_WORKER_QUEUE_HANDOFF: "queue-handoff:verification-jobs",
  CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF: "consume-readiness:ready",
  CAMPAIGN_OS_PROVIDER_RUNBOOK_URL: "runbook-ref:provider-client",
  CAMPAIGN_OS_PROVIDER_REDACTION_POLICY: "redaction-policy:provider-client",
} satisfies Record<string, unknown>;

const missingProductionDiagnosticCodes: ProviderClientDiagnosticCode[] = [
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
];

const safeRequest: ProviderVerificationRequest = {
  attempt: {
    count: 1,
    maxAttempts: 3,
  },
  campaignId: "campaign-ref:provider-client",
  evidenceHash: "sha256:provider-evidence",
  evidenceRef: "evidence-ref:task-1",
  idempotencyRef: "idem-ref:campaign-task-wallet",
  leaseRef: "lease-ref:worker-task",
  operatorContext: {
    source: "unit-test",
  },
  providerGroupId: "aefinder-aelfscan-indexers",
  queueId: "verification-jobs",
  taskId: "task-ref:on-chain-1",
  traceId: "trace-provider-client-1",
  verificationType: "ON_CHAIN",
  walletAccountRef: "wallet-ref:account-1",
  walletSessionRef: "session-ref:wallet-1",
  workerJobId: "task-verification-worker",
};

const completedClient: ProviderClient = {
  clientId: "aefinder-aelfscan-client",
  evaluate: () => ({
    evidenceHash: "sha256:provider-evidence",
    evidenceRef: "evidence-ref:task-1",
    status: "completed",
  }),
  providerGroupId: "aefinder-aelfscan-indexers",
};

function createReadyReadiness(client: ProviderClient = completedClient) {
  return createProviderIndexerClientReadiness({
    clients: [client],
    env: productionReadyProviderEnv,
    profileId: "production-required",
  });
}

describe("provider indexer client readiness boundary", () => {
  it("keeps local review deterministic and no-live", () => {
    const startedAt = performance.now();
    const readiness = createProviderIndexerClientReadiness({ profileId: "local-review" });
    const elapsedMs = performance.now() - startedAt;

    expect(elapsedMs).toBeLessThan(100);
    expect(readiness.id).toBe("campaign-os-provider-indexer-client-readiness");
    expect(readiness).toMatchObject({
      activationStatus: "disabled",
      blockerCount: 0,
      liveProviderCallsAttempted: false,
      productionReady: false,
      providerClientsEnabled: false,
      providerClientsProvided: false,
      status: "disabled",
      valid: true,
    });
    expect(readiness.downstreamLiveFlags).toEqual(providerClientDownstreamLiveFlags);
    expect(readiness.providerHttpRuntime).toMatchObject({
      activationStatus: "disabled",
      endpointCount: 2,
      id: "campaign-os-provider-http-client-runtime",
      liveHttpCallsAttempted: false,
      productionReady: false,
      status: "disabled",
      transportProvided: false,
      valid: true,
    });
    expect(readiness.providerHttpRuntime.configuredCategories).toEqual(["indexer", "dapp_api"]);
    expect(Object.values(readiness.downstreamLiveFlags).every((value) => value === false)).toBe(
      true,
    );
    expect(readiness.diagnosticCodes).toEqual([]);
  });

  it("fails closed for production-required when provider client preconditions are missing", () => {
    const readiness = createProviderIndexerClientReadiness({ profileId: "production-required" });

    expect(readiness.status).toBe("blocked");
    expect(readiness.valid).toBe(false);
    expect(readiness.productionReady).toBe(false);
    expect(readiness.providerClientsEnabled).toBe(false);
    expect(readiness.blockerCount).toBe(providerClientProductionPreconditions.length);
    expect(readiness.providerHttpRuntime).toMatchObject({
      activationStatus: "activation_required",
      liveHttpCallsAttempted: false,
      productionReady: false,
      status: "blocked",
      transportProvided: false,
      valid: false,
    });
    expect(readiness.providerHttpRuntime.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "PROVIDER_HTTP_RUNTIME_ACTIVATION_MISSING",
        "PROVIDER_HTTP_ENDPOINT_REGISTRY_MISSING",
        "PROVIDER_HTTP_TRANSPORT_SEAM_MISSING",
      ]),
    );
    expect(readiness.diagnosticCodes).toEqual(missingProductionDiagnosticCodes);
    expect(readiness.diagnostics.every((diagnostic) => diagnostic.severity === "blocker")).toBe(
      true,
    );
  });

  it("evaluates a safe request through an injected provider client seam", () => {
    const readiness = createReadyReadiness();
    const result = evaluateProviderVerificationRequest(safeRequest, { readiness });

    expect(readiness).toMatchObject({
      liveProviderCallsAttempted: false,
      productionReady: false,
      providerClientsEnabled: true,
      status: "activated",
      valid: true,
    });
    expect(result).toMatchObject({
      clientExecuted: true,
      downstreamLiveFlags: providerClientDownstreamLiveFlags,
      evidenceHash: "sha256:provider-evidence",
      evidenceRef: "evidence-ref:task-1",
      liveProviderCallsAttempted: true,
      outcome: "completed",
      providerGroupId: "aefinder-aelfscan-indexers",
      retryPosture: "none",
      taskId: "task-ref:on-chain-1",
      traceId: "trace-provider-client-1",
    });
  });

  it("rejects unsafe requests before provider client execution", () => {
    let clientCalled = false;
    const guardedClient: ProviderClient = {
      ...completedClient,
      evaluate: () => {
        clientCalled = true;
        return { status: "completed" };
      },
    };
    const readiness = createReadyReadiness(guardedClient);
    const result = evaluateProviderVerificationRequest(
      {
        ...safeRequest,
        evidenceRef: "https://storage.example/raw.csv?X-Amz-Signature=abc123",
        idempotencyRef: "idem-token=secret-wallet",
        leaseRef: "lease-token=secret-worker",
        operatorContext: {
          rawPayload: "{\"walletAddress\":\"ELF_SECRET\",\"providerPayload\":true}",
        },
      },
      { readiness },
    );

    expect(clientCalled).toBe(false);
    expect(result).toMatchObject({
      clientExecuted: false,
      liveProviderCallsAttempted: false,
      outcome: "blocked",
      retryPosture: "blocked",
    });
    expect(result.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "PROVIDER_CLIENT_UNSAFE_EVIDENCE_REFERENCE",
        "PROVIDER_CLIENT_UNSAFE_IDEMPOTENCY_REFERENCE",
        "PROVIDER_CLIENT_UNSAFE_LEASE_REFERENCE",
        "PROVIDER_CLIENT_UNSAFE_OPERATOR_CONTEXT",
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("ELF_SECRET");
    expect(JSON.stringify(result)).not.toContain("secret-worker");
    expect(JSON.stringify(result)).not.toContain("abc123");
  });

  it("maps provider failure outcomes without completing unavailable evidence", () => {
    const timeoutReadiness = createReadyReadiness({
      ...completedClient,
      evaluate: () => ({ status: "timeout" }),
    });
    const exhaustedRateLimitReadiness = createReadyReadiness({
      ...completedClient,
      evaluate: () => ({ status: "rate_limited", retryAfterMs: 30_000 }),
    });
    const unavailableReadiness = createReadyReadiness({
      ...completedClient,
      evaluate: () => ({ status: "unavailable" }),
    });
    const malformedReadiness = createReadyReadiness({
      ...completedClient,
      evaluate: () => ({ evidenceRef: "evidence-ref:missing-hash", status: "completed" }),
    });

    const timeoutResult = evaluateProviderVerificationRequest(safeRequest, {
      readiness: timeoutReadiness,
    });
    const exhaustedRateLimitResult = evaluateProviderVerificationRequest(
      {
        ...safeRequest,
        attempt: { count: 3, maxAttempts: 3 },
        traceId: "trace-provider-client-exhausted",
      },
      { readiness: exhaustedRateLimitReadiness },
    );
    const unavailableResult = evaluateProviderVerificationRequest(safeRequest, {
      readiness: unavailableReadiness,
    });
    const malformedResult = evaluateProviderVerificationRequest(safeRequest, {
      readiness: malformedReadiness,
    });

    expect(timeoutResult).toMatchObject({
      diagnosticCodes: ["PROVIDER_CLIENT_TIMEOUT"],
      outcome: "pending",
      retryPosture: "retry_scheduled",
    });
    expect(exhaustedRateLimitResult).toMatchObject({
      diagnosticCodes: ["PROVIDER_CLIENT_RATE_LIMITED"],
      outcome: "manual_review",
      retryPosture: "exhausted",
    });
    expect(unavailableResult).toMatchObject({
      diagnosticCodes: ["PROVIDER_CLIENT_UNAVAILABLE"],
      outcome: "pending",
    });
    expect(malformedResult).toMatchObject({
      diagnosticCodes: ["PROVIDER_CLIENT_COMPLETION_EVIDENCE_MISSING"],
      outcome: "blocked",
    });
    expect([
      timeoutResult.outcome,
      exhaustedRateLimitResult.outcome,
      unavailableResult.outcome,
      malformedResult.outcome,
    ]).not.toContain("completed");
  });

  it("handles duplicate idempotency, lease conflict, circuit breaker open, and thrown errors", () => {
    const duplicateReadiness = createReadyReadiness({
      ...completedClient,
      evaluate: () => ({ status: "duplicate" }),
    });
    const leaseConflictReadiness = createReadyReadiness({
      ...completedClient,
      evaluate: () => ({ status: "lease_conflict" }),
    });
    const circuitOpenReadiness = createProviderIndexerClientReadiness({
      clients: [completedClient],
      env: {
        ...productionReadyProviderEnv,
        CAMPAIGN_OS_PROVIDER_CIRCUIT_BREAKER_STATE: "open",
      },
      profileId: "production-required",
    });
    const throwingReadiness = createReadyReadiness({
      ...completedClient,
      evaluate: () => {
        throw new Error("provider token=secret payload={\"walletAddress\":\"ELF_SECRET\"}");
      },
    });

    const duplicateResult = evaluateProviderVerificationRequest(safeRequest, {
      readiness: duplicateReadiness,
    });
    const leaseConflictResult = evaluateProviderVerificationRequest(safeRequest, {
      readiness: leaseConflictReadiness,
    });
    const circuitOpenResult = evaluateProviderVerificationRequest(safeRequest, {
      readiness: circuitOpenReadiness,
    });
    const thrownResult = evaluateProviderVerificationRequest(safeRequest, {
      readiness: throwingReadiness,
    });

    expect(duplicateResult).toMatchObject({
      clientExecuted: true,
      idempotencyDecision: "duplicate_drop",
      outcome: "blocked",
    });
    expect(leaseConflictResult).toMatchObject({
      clientExecuted: true,
      leaseDecision: "conflict",
      outcome: "blocked",
    });
    expect(circuitOpenResult).toMatchObject({
      clientExecuted: false,
      diagnosticCodes: ["PROVIDER_CLIENT_CIRCUIT_BREAKER_OPEN"],
      outcome: "blocked",
    });
    expect(thrownResult).toMatchObject({
      clientExecuted: true,
      diagnosticCodes: ["PROVIDER_CLIENT_THROWN_ERROR"],
      outcome: "failed",
    });
    expect(JSON.stringify(thrownResult)).not.toContain("ELF_SECRET");
    expect(JSON.stringify(thrownResult)).not.toContain("secret");
  });

  it("redacts provider-supplied diagnostics and unsafe completion evidence", () => {
    const unsafeResponseReadiness = createReadyReadiness({
      ...completedClient,
      evaluate: () => ({
        diagnostics: [
          {
            code: "PROVIDER_CLIENT_MALFORMED_RESPONSE",
            field: "providerPayload",
            message: "raw token=secret walletAddress=ELF_SECRET",
            redactedFields: [],
            severity: "blocker",
          },
        ],
        evidenceHash: "sha256:provider-evidence?token=secret",
        evidenceRef: "https://storage.example/raw.csv?X-Amz-Signature=abc123",
        status: "completed",
      }),
    });
    const result = evaluateProviderVerificationRequest(safeRequest, {
      readiness: unsafeResponseReadiness,
    });
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      clientExecuted: true,
      diagnosticCodes: expect.arrayContaining([
        "PROVIDER_CLIENT_COMPLETION_EVIDENCE_MISSING",
        "PROVIDER_CLIENT_MALFORMED_RESPONSE",
      ]),
      outcome: "blocked",
    });
    expect(serialized).not.toContain("ELF_SECRET");
    expect(serialized).not.toContain("token=secret");
    expect(serialized).not.toContain("abc123");
  });

  it("redacts nested provider client material", () => {
    const redacted = redactProviderClientValue({
      apiKey: "api-key-live-123",
      bearerToken: "Bearer live-token-456",
      endpoint: "https://user:password@indexer.example/graphql?token=query-secret",
      idempotencyKey: "idem-token=secret-wallet",
      leaseToken: "lease-token=secret-worker",
      nested: {
        objectKey: "tenant/raw/object-key.csv",
        providerPayload: "{\"walletAddress\":\"ELF_payload_wallet\",\"score\":99}",
        signedUrl: "https://storage.example/file.csv?X-Amz-Signature=abc123",
        socialToken: "social-token-789",
      },
      stack: "Error: provider failed\n    at secret.ts:1:1",
    });

    expect(redacted).toEqual({
      apiKey: "[redacted]",
      bearerToken: "[redacted]",
      endpoint: "[redacted]",
      idempotencyKey: "[redacted]",
      leaseToken: "[redacted]",
      nested: {
        objectKey: "[redacted]",
        providerPayload: "[redacted-provider-payload]",
        signedUrl: "[redacted]",
        socialToken: "[redacted]",
      },
      stack: "[redacted]",
    });
  });
});
