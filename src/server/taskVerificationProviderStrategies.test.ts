import { inspect } from "node:util";
import { describe, expect, it } from "vitest";
import {
  createCanonicalTaskVerificationRevision,
  deriveTaskVerificationIdentity,
  issueTrustedTaskVerificationIdentityInput,
} from "./taskVerification";
import type { TaskVerificationBinding } from "./taskVerificationConfig";
import { providerHttpResponseNormalizerSupportedMappingIds } from "./providerHttpResponseNormalizer";
import {
  TaskVerificationProviderStrategyRegistryError,
  createCanonicalProviderResultDigest,
  createTaskVerificationProviderStrategyRegistry,
  defaultTaskVerificationProviderBindingStrategies,
  taskVerificationProviderStrategyIds,
  type TaskVerificationProviderBindingStrategy,
} from "./taskVerificationProviderStrategies";
import { providerHttpEndpointRegistry } from "./providerHttpRuntimeRegistry";

const EVIDENCE_HASH = "a".repeat(64);

const binding = (
  overrides: Partial<TaskVerificationBinding> = {},
): TaskVerificationBinding => Object.freeze({
  bodyEnvKey: "CAMPAIGN_OS_FAKE_PROVIDER_BODY",
  credentialEnvKey: "CAMPAIGN_OS_FAKE_PROVIDER_CREDENTIAL",
  degradationPolicy: "manual_review",
  enabled: true,
  endpointEnvKey: "CAMPAIGN_OS_FAKE_PROVIDER_ENDPOINT",
  endpointId: "aefinder-aelfscan-indexer-query",
  evidenceSource: "AELFSCAN",
  headerEnvKey: "CAMPAIGN_OS_FAKE_PROVIDER_HEADERS",
  id: "fake-on-chain-binding",
  maxAttempts: 3,
  maxResponseBytes: 256 * 1024,
  providerFamily: "aefinder",
  providerGroupId: "aefinder-aelfscan-indexers",
  requestMappingId: "provider-http-request-map:on-chain-indexer-v1",
  responseMappingId: "provider-http-response-map:on-chain-indexer-v1",
  revision: 1,
  timeoutMs: 2_500,
  verificationType: "ON_CHAIN",
  ...overrides,
});

const canonicalInput = (
  evidenceRule: Record<string, unknown> = {
    chainId: "chain-ref:fake-a",
    expectedField: "verified",
    expectedType: "boolean",
    expectedValue: true,
  },
  verificationType: "ON_CHAIN" | "DAPP_API" = "ON_CHAIN",
) => {
  const task = createCanonicalTaskVerificationRevision({
    campaignId: "campaign-fake-1",
    evidenceRule,
    points: 25,
    required: true,
    revision: 2,
    taskId: "task-fake-1",
    traceId: "trace-strategy-fixture",
    updatedAt: "2026-07-15T00:00:00.000Z",
    verificationType,
    walletPolicy: "ANY",
  });
  const identity = deriveTaskVerificationIdentity(
    issueTrustedTaskVerificationIdentityInput({
      binding: {
        bindingId: verificationType === "ON_CHAIN"
          ? "fake-on-chain-binding"
          : "fake-dapp-binding",
        bindingRevision: 1,
      },
      issuedSubject: {
        accountType: "AA",
        sessionRef: "session-ref:fake-1",
        walletAddress: "ELF_FAKE_WALLET_SENTINEL",
        walletSource: "PORTKEY_AA",
      },
      task,
      traceId: "trace-strategy-fixture",
    }),
  );

  return { identity, task };
};

describe("task verification provider strategies", () => {
  it("pins immutable protocol strategy ids and rejects duplicate definitions", () => {
    expect(taskVerificationProviderStrategyIds).toEqual([
      "on-chain-indexer-v1",
      "dapp-api-status-v1",
      "sandbox-verification-v1",
    ]);
    expect(Object.isFrozen(taskVerificationProviderStrategyIds)).toBe(true);

    const duplicate = defaultTaskVerificationProviderBindingStrategies[0];

    expect(() => createTaskVerificationProviderStrategyRegistry({
      bindingStrategies: [duplicate, { ...duplicate }],
      environment: "local",
    })).toThrowError(TaskVerificationProviderStrategyRegistryError);
    expect(() => createTaskVerificationProviderStrategyRegistry({
      environment: "local",
      strategies: [
        { id: "on-chain-indexer-v1" },
        { id: "on-chain-indexer-v1" },
      ],
    })).toThrowError(expect.objectContaining({
      code: "TASK_VERIFICATION_STRATEGY_DUPLICATE",
    }));
    expect(() => createTaskVerificationProviderStrategyRegistry({
      bindingStrategies: [{ ...duplicate, strategyId: "unknown-strategy-v1" } as never],
      environment: "local",
    })).toThrowError(expect.objectContaining({
      code: "TASK_VERIFICATION_STRATEGY_UNKNOWN",
    }));
  });

  it("builds only allowlisted safe refs from canonical wallet, chain, and rule authority", () => {
    const registry = createTaskVerificationProviderStrategyRegistry({ environment: "local" });
    const { identity, task } = canonicalInput();
    const result = registry.buildRequest({
      attempt: { count: 1, maxAttempts: 3 },
      binding: binding(),
      identity,
      task,
      traceId: "trace-strategy-build",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.strategyId).toBe("on-chain-indexer-v1");
    expect(result.plannerInput).toMatchObject({
      bodyRef: "config-ref:campaign_os_fake_provider_body",
      campaignId: "campaign-fake-1",
      endpointId: "aefinder-aelfscan-indexer-query",
      idempotencyRef: `idem-ref:${identity.idempotencyKey}`,
      maxResponseBytes: 256 * 1024,
      requestMaterialRef: expect.stringMatching(/^request-ref:[a-f0-9]{64}$/),
      strategyId: "on-chain-indexer-v1",
      taskId: "task-fake-1",
      timeoutMs: 2_500,
      traceId: "trace-strategy-build",
    });
    const serialized = JSON.stringify(result.plannerInput);
    expect(serialized).not.toContain("ELF_FAKE_WALLET_SENTINEL");
    expect(serialized).not.toContain("chain-ref:fake-a");
    expect(result.plannerInput).not.toHaveProperty("path");
    expect(result.plannerInput).not.toHaveProperty("query");
    expect(result.plannerInput).not.toHaveProperty("headers");
    expect(result.plannerInput).not.toHaveProperty("authorization");
    expect(Object.keys(result.requestMaterial)).toEqual([]);
    expect(JSON.stringify(result.requestMaterial)).toBe("{}");
    expect(inspect(result)).not.toContain("ELF_FAKE_WALLET_SENTINEL");
    expect(inspect(result)).not.toContain("chain-ref:fake-a");
  });

  it.each([
    ["path", "/arbitrary"],
    ["query", "unsafe=true"],
    ["route", "arbitrary-route"],
  ])("rejects arbitrary on-chain rule field %s", (field, value) => {
    const registry = createTaskVerificationProviderStrategyRegistry({ environment: "local" });
    const { identity, task } = canonicalInput({
      chainId: "chain-ref:fake-a",
      expectedField: "verified",
      expectedType: "boolean",
      expectedValue: true,
      [field]: value,
    });

    const result = registry.buildRequest({
      attempt: { count: 1, maxAttempts: 3 },
      binding: binding(),
      identity,
      task,
      traceId: "trace-strategy-reject",
    });

    expect(result).toMatchObject({
      diagnosticCode: "TASK_VERIFICATION_STRATEGY_RULE_UNSUPPORTED",
      ok: false,
    });
  });

  it("extends bounded dapp primitive fields through registry data", () => {
    const customDefinition: TaskVerificationProviderBindingStrategy = Object.freeze({
      allowedRuleFields: Object.freeze([
        "actionKind",
        "expectedField",
        "expectedType",
        "expectedValue",
      ]),
      providerFamily: "ebridge",
      requestMapping: Object.freeze({
        fields: Object.freeze([
          Object.freeze({
            name: "participantWallet",
            required: true,
            source: "participant.walletAddress",
            target: "path",
          }),
          Object.freeze({
            name: "taskId",
            required: true,
            source: "task.taskId",
            target: "path",
          }),
          Object.freeze({
            name: "actionKind",
            required: true,
            source: "rule.actionKind",
            target: "query",
          }),
        ]),
        method: "GET",
        pathTemplate: "/participants/{participantWallet}/tasks/{taskId}",
      }),
      requestMappingId: "provider-http-request-map:dapp-api-status-v1",
      responseFieldAliases: Object.freeze({ result: "eligible" }),
      responseMappingId: "provider-http-response-map:dapp-api-status-v1",
      strategyId: "dapp-api-status-v1",
      verificationType: "DAPP_API",
    });
    const registry = createTaskVerificationProviderStrategyRegistry({
      bindingStrategies: [customDefinition],
      environment: "stage",
    });
    const dappBinding = binding({
      evidenceSource: "DAPP_API",
      endpointId: "dapp-api-verification-status",
      id: "fake-dapp-binding",
      providerFamily: "ebridge",
      providerGroupId: "dapp-api-adapters",
      requestMappingId: "provider-http-request-map:dapp-api-status-v1",
      responseMappingId: "provider-http-response-map:dapp-api-status-v1",
      verificationType: "DAPP_API",
    });
    const { identity, task } = canonicalInput({
      actionKind: "fake-action",
      expectedField: "result",
      expectedType: "boolean",
      expectedValue: true,
    }, "DAPP_API");
    const built = registry.buildRequest({
      attempt: { count: 1, maxAttempts: 3 },
      binding: dappBinding,
      identity,
      task,
      traceId: "trace-dapp-build",
    });

    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    expect(built.matcher({
      body: {
        eligible: true,
        evidenceHash: EVIDENCE_HASH,
        evidenceRef: "evidence-ref:fake-result",
        status: "completed",
      },
      statusCode: 200,
      transportExecuted: true,
    })).toMatchObject({
      evidenceHash: EVIDENCE_HASH,
      outcome: "completed",
      positiveMatch: true,
    });
    expect(built.plannerInput.requestMaterialRef).toMatch(/^request-ref:[a-f0-9]{64}$/);
  });

  it("rejects non-primitive dapp request fields", () => {
    const registry = createTaskVerificationProviderStrategyRegistry({ environment: "stage" });
    const dappBinding = binding({
      evidenceSource: "DAPP_API",
      endpointId: "dapp-api-verification-status",
      id: "fake-dapp-binding",
      providerFamily: "ebridge",
      providerGroupId: "dapp-api-adapters",
      requestMappingId: "provider-http-request-map:dapp-api-status-v1",
      responseMappingId: "provider-http-response-map:dapp-api-status-v1",
      verificationType: "DAPP_API",
    });

    const { identity, task } = canonicalInput({
      action: ["not", "primitive"],
      expectedField: "verified",
      expectedType: "boolean",
      expectedValue: true,
    }, "DAPP_API");
    expect(registry.buildRequest({
      attempt: { count: 1, maxAttempts: 3 },
      binding: dappBinding,
      identity,
      task,
      traceId: "trace-dapp-bounds",
    })).toMatchObject({
      diagnosticCode: "TASK_VERIFICATION_STRATEGY_RULE_UNSUPPORTED",
      ok: false,
    });
  });

  it("keeps canonical rule values out of serializable strategy surfaces", () => {
    const registry = createTaskVerificationProviderStrategyRegistry({ environment: "stage" });
    const dappBinding = binding({
      evidenceSource: "DAPP_API",
      endpointId: "dapp-api-verification-status",
      id: "fake-dapp-binding",
      providerFamily: "ebridge",
      providerGroupId: "dapp-api-adapters",
      requestMappingId: "provider-http-request-map:dapp-api-status-v1",
      responseMappingId: "provider-http-response-map:dapp-api-status-v1",
      verificationType: "DAPP_API",
    });
    const { identity, task } = canonicalInput({
      action: "ELF_FAKE_RULE_ACTION_SENTINEL",
      expectedField: "result",
      expectedType: "string",
      expectedValue: "ELF_FAKE_RULE_EXPECTATION_SENTINEL",
    }, "DAPP_API");
    const built = registry.buildRequest({
      attempt: { count: 1, maxAttempts: 3 },
      binding: dappBinding,
      identity,
      task,
      traceId: "trace-dapp-secret-corpus",
    });

    expect(built.ok).toBe(true);
    expect(JSON.stringify(built)).not.toContain("ELF_FAKE_RULE_ACTION_SENTINEL");
    expect(JSON.stringify(built)).not.toContain("ELF_FAKE_RULE_EXPECTATION_SENTINEL");
    expect(inspect(built)).not.toContain("ELF_FAKE_RULE_ACTION_SENTINEL");
    expect(inspect(built)).not.toContain("ELF_FAKE_RULE_EXPECTATION_SENTINEL");
  });

  it("enables sandbox only for loopback postures outside production", () => {
    const local = createTaskVerificationProviderStrategyRegistry({ environment: "local" });
    const stage = createTaskVerificationProviderStrategyRegistry({ environment: "stage" });
    const production = createTaskVerificationProviderStrategyRegistry({ environment: "production" });

    expect(local.resolveById("sandbox-verification-v1")).toMatchObject({ ok: true });
    expect(stage.resolveById("sandbox-verification-v1")).toMatchObject({ ok: true });
    expect(production.resolveById("sandbox-verification-v1")).toMatchObject({
      diagnosticCode: "TASK_VERIFICATION_STRATEGY_POSTURE_BLOCKED",
      ok: false,
    });
  });

  it("requires expected field, type, value, transport, and safe evidence for a positive match", () => {
    const registry = createTaskVerificationProviderStrategyRegistry({ environment: "local" });
    const { identity, task } = canonicalInput();
    const built = registry.buildRequest({
      attempt: { count: 1, maxAttempts: 3 },
      binding: binding(),
      identity,
      task,
      traceId: "trace-match",
    });

    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    const positiveBody = {
      evidenceHash: EVIDENCE_HASH,
      evidenceRef: "evidence-ref:fake-result",
      status: "completed",
      verified: true,
    };

    expect(built.matcher({
      body: positiveBody,
      statusCode: 200,
      transportExecuted: true,
    })).toMatchObject({ outcome: "completed", positiveMatch: true });
    expect(built.matcher({
      body: positiveBody,
      statusCode: 200,
      transportExecuted: false,
    })).toMatchObject({ outcome: "manual_review", positiveMatch: false });
    expect(built.matcher({
      body: { ...positiveBody, evidenceHash: "not-a-safe-hash" },
      statusCode: 200,
      transportExecuted: true,
    })).toMatchObject({ outcome: "manual_review", positiveMatch: false });
    expect(built.matcher({
      body: { ...positiveBody, verified: "true" },
      statusCode: 200,
      transportExecuted: true,
    })).toMatchObject({ outcome: "manual_review", positiveMatch: false });
  });

  it("maps business negative, provider pending, and malformed or unknown responses fail closed", () => {
    const registry = createTaskVerificationProviderStrategyRegistry({ environment: "local" });
    const { identity, task } = canonicalInput();
    const built = registry.buildRequest({
      attempt: { count: 1, maxAttempts: 3 },
      binding: binding(),
      identity,
      task,
      traceId: "trace-match-matrix",
    });

    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    const match = (body: unknown) => built.matcher({
      body,
      statusCode: 200,
      transportExecuted: true,
    });

    expect(match({ status: "completed", verified: false })).toMatchObject({
      outcome: "failed",
      positiveMatch: false,
    });
    expect(match({ status: "pending" })).toMatchObject({
      outcome: "pending",
      positiveMatch: false,
    });
    expect(match({ status: "unrecognized" })).toMatchObject({
      outcome: "manual_review",
      positiveMatch: false,
    });
    expect(match({ verified: true })).toMatchObject({
      outcome: "manual_review",
      positiveMatch: false,
    });
    expect(match(null)).toMatchObject({
      outcome: "manual_review",
      positiveMatch: false,
    });
  });

  it("binds every enabled provider registry mapping through protocol strategy data", () => {
    const enabledEndpoints = providerHttpEndpointRegistry.filter(
      ({ rolloutStatus }) => rolloutStatus === "enabled",
    );
    const supportedPairs = new Set(
      defaultTaskVerificationProviderBindingStrategies.map((entry) =>
        `${entry.requestMappingId}\u0000${entry.responseMappingId}`),
    );

    expect(enabledEndpoints.length).toBeGreaterThanOrEqual(5);
    expect(enabledEndpoints.every((endpoint) => supportedPairs.has(
      `${endpoint.requestMappingId}\u0000${endpoint.responseMappingId}`,
    ))).toBe(true);
    expect(defaultTaskVerificationProviderBindingStrategies.every(({ requestMapping }) =>
      Object.isFrozen(requestMapping)
      && Object.isFrozen(requestMapping.fields)
      && requestMapping.fields.some(({ target }) => target === "path")
    )).toBe(true);
    expect(new Set(
      defaultTaskVerificationProviderBindingStrategies
        .filter(({ verificationType }) => verificationType === "DAPP_API")
        .map(({ strategyId }) => strategyId),
    )).toEqual(new Set(["dapp-api-status-v1"]));
    expect(new Set(providerHttpResponseNormalizerSupportedMappingIds)).toEqual(
      new Set(enabledEndpoints.map(({ responseMappingId }) => responseMappingId)),
    );
  });

  it("keeps canonical safe result digests stable across key order without retaining raw response", () => {
    const left = createCanonicalProviderResultDigest({
      diagnosticCodes: ["PROVIDER_MATCH_POSITIVE"],
      evidenceHash: EVIDENCE_HASH,
      evidenceRef: "evidence-ref:fake-result",
      outcome: "completed",
      positiveMatch: true,
      strategyId: "on-chain-indexer-v1",
      traceId: "trace-digest",
    });
    const right = createCanonicalProviderResultDigest({
      traceId: "trace-digest",
      strategyId: "on-chain-indexer-v1",
      positiveMatch: true,
      outcome: "completed",
      evidenceRef: "evidence-ref:fake-result",
      evidenceHash: EVIDENCE_HASH,
      diagnosticCodes: ["PROVIDER_MATCH_POSITIVE"],
    });

    expect(left).toBe(right);
    expect(left).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify({ digest: left })).not.toContain("rawResponse");
    expect(() => createCanonicalProviderResultDigest({
      diagnosticCodes: [],
      outcome: "manual_review",
      positiveMatch: false,
      rawResponse: "fake-raw-response-sentinel",
      strategyId: "on-chain-indexer-v1",
      traceId: "trace-digest",
    } as never)).toThrowError(expect.objectContaining({
      code: "TASK_VERIFICATION_STRATEGY_RESULT_INVALID",
    }));
  });
});
