import { describe, expect, it, vi } from "vitest";
import {
  createCanonicalTaskVerificationRevision,
  deriveTaskVerificationIdentity,
  issueTrustedTaskVerificationIdentityInput,
  type CanonicalTaskVerificationRevision,
  type TaskVerificationIdentity,
} from "./taskVerification";
import {
  TASK_VERIFICATION_APPROVED_ENABLEMENT,
  resolveTaskVerificationConfig,
  type TaskVerificationBinding,
  type TaskVerificationConfig,
} from "./taskVerificationConfig";
import {
  createMemoryTaskVerificationAttemptStore,
  type BeginTaskVerificationAttemptResult,
  type FinalizeTaskVerificationAttemptResult,
  type MarkTaskVerificationTransportStartedResult,
  type TaskVerificationAttemptSafeRecord,
  type TaskVerificationAttemptStore,
} from "./taskVerificationAttemptStore";
import {
  TaskVerificationRuntime,
  type TaskVerificationFinalizationWriteFactory,
} from "./taskVerificationRuntime";
import { createProviderHttpExecutionMaterialResolver } from "./providerHttpExecutionMaterial";
import { createProviderHttpFetchTransport } from "./providerHttpFetchTransport";
import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import type { ProviderHttpTransport, ProviderHttpTransportResult } from "./providerHttpTransport";

const TRACE_ID = "trace-task-runtime";
const EVIDENCE_HASH = "a".repeat(64);
const ENDPOINT_KEY = "CAMPAIGN_OS_FAKE_RUNTIME_ENDPOINT";

const providerRuntimeEnv = {
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

const providerRuntime = createProviderHttpRuntimeSummary({
  env: providerRuntimeEnv,
  profileId: "production-required",
  transportProvided: true,
});

const bindingDescriptor = (
  overrides: Partial<Record<keyof TaskVerificationBinding, unknown>> = {},
): Record<string, unknown> => ({
  degradationPolicy: "manual_review",
  enabled: true,
  endpointEnvKey: ENDPOINT_KEY,
  endpointId: "aefinder-aelfscan-indexer-query",
  evidenceSource: "AELFSCAN",
  id: "fake-runtime-binding",
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

const config = (enabled = true): TaskVerificationConfig => resolveTaskVerificationConfig({
  bindingsJson: JSON.stringify([bindingDescriptor()]),
  enablement: enabled ? TASK_VERIFICATION_APPROVED_ENABLEMENT : undefined,
  env: { [ENDPOINT_KEY]: "http://127.0.0.1:4179/verify" },
  environment: "local",
  providerHttpTransportProvided: true,
});

const authority = (): {
  identity: TaskVerificationIdentity;
  task: CanonicalTaskVerificationRevision;
} => {
  const task = createCanonicalTaskVerificationRevision({
    campaignId: "campaign-runtime",
    evidenceRule: {
      chainId: "chain-ref:fake-runtime",
      expectedField: "verified",
      expectedType: "boolean",
      expectedValue: true,
    },
    points: 25,
    required: true,
    revision: 1,
    taskId: "task-runtime",
    traceId: TRACE_ID,
    updatedAt: "2026-07-16T00:00:00.000Z",
    verificationType: "ON_CHAIN",
    walletPolicy: "ANY",
  });
  const identity = deriveTaskVerificationIdentity(
    issueTrustedTaskVerificationIdentityInput({
      binding: { bindingId: "fake-runtime-binding", bindingRevision: 1 },
      issuedSubject: {
        accountType: "AA",
        sessionRef: "session-ref:fake-runtime",
        walletAddress: "ELF_FAKE_RUNTIME_WALLET",
        walletSource: "PORTKEY_AA",
      },
      task,
      traceId: TRACE_ID,
    }),
  );
  return { identity, task };
};

const successfulTransportResult = (): ProviderHttpTransportResult => ({
  body: {
    evidenceHash: EVIDENCE_HASH,
    evidenceRef: "evidence-ref:fake-runtime-result",
    status: "completed",
    verified: true,
  },
  durationMs: 12,
  statusCode: 200,
  timedOut: false,
});

const baseAttempt = (
  overrides: Partial<TaskVerificationAttemptSafeRecord> = {},
): TaskVerificationAttemptSafeRecord => ({
  accountType: "AA",
  attemptCount: 1,
  bindingId: "fake-runtime-binding",
  bindingRevision: 1,
  campaignId: "campaign-runtime",
  createdAt: "2026-07-16T00:00:00.000Z",
  diagnosticCodes: [],
  dispatchState: "not_started",
  evidenceRuleDigest: authority().identity.evidenceRuleDigest,
  externalDispatchLimit: 1,
  fence: 1,
  id: "attempt-runtime",
  idempotencyKey: authority().identity.idempotencyKey,
  leaseExpiresAt: "2026-07-16T00:01:00.000Z",
  maxAttempts: 3,
  providerRef: "fake-runtime-binding",
  retryPosture: "none",
  status: "running",
  taskId: "task-runtime",
  taskRevision: 1,
  taskRevisionDigest: authority().task.taskRevisionDigest,
  traceId: TRACE_ID,
  updatedAt: "2026-07-16T00:00:00.000Z",
  verificationType: "ON_CHAIN",
  walletAddress: "ELF_FAKE_RUNTIME_WALLET",
  walletSource: "PORTKEY_AA",
  ...overrides,
});

interface FakeStoreOptions {
  beginKind?: BeginTaskVerificationAttemptResult["kind"];
  beginThrows?: boolean;
  events?: string[];
  finalizeKind?: FinalizeTaskVerificationAttemptResult["kind"];
  finalizeThrows?: boolean;
  markKind?: MarkTaskVerificationTransportStartedResult["kind"];
  markThrows?: boolean;
}

const fakeStore = (options: FakeStoreOptions = {}) => {
  const events = options.events ?? [];
  const owner = Object.freeze({ attemptId: "attempt-runtime", fence: 1 });
  const begin = vi.fn<TaskVerificationAttemptStore["begin"]>(async () => {
    events.push("begin");
    if (options.beginThrows) {
      throw new Error("fake-secret-begin-detail");
    }
    const kind = options.beginKind ?? "acquired";
    const attempt = baseAttempt({
      ...(kind === "existing_terminal" ? {
        completedAt: "2026-07-16T00:00:01.000Z",
        dispatchState: "result_observed" as const,
        evidenceHash: EVIDENCE_HASH,
        evidenceRef: "evidence-ref:fake-runtime-result",
        evidenceSource: "AELFSCAN" as const,
        status: "completed" as const,
      } : {}),
      ...(kind === "recovery_required" ? {
        diagnosticCodes: ["TASK_VERIFICATION_OUTCOME_UNKNOWN"],
        dispatchState: "started" as const,
        status: "manual_review" as const,
      } : {}),
    });
    return kind === "acquired"
      ? { attempt, kind, owner }
      : { attempt, kind };
  });
  const markTransportStarted = vi.fn<TaskVerificationAttemptStore["markTransportStarted"]>(
    async () => {
      events.push("mark");
      if (options.markThrows) {
        throw new Error("fake-token-mark-detail");
      }
      return {
        attempt: baseAttempt({ dispatchState: "started" }),
        kind: options.markKind ?? "marked",
      };
    },
  );
  const finalize = vi.fn<TaskVerificationAttemptStore["finalize"]>(async (input) => {
    events.push("finalize");
    if (options.finalizeThrows) {
      throw new Error("fake-credential-finalize-detail");
    }
    const status = input.transition.status;
    return {
      attempt: baseAttempt({
        completedAt: input.completedAt,
        diagnosticCodes: input.transition.diagnosticCodes,
        dispatchState: "result_observed",
        ...(input.transition.evidence ?? {}),
        responseDigest: input.responseDigest,
        status,
      }),
      kind: options.finalizeKind ?? "committed",
    };
  });
  const store: TaskVerificationAttemptStore = {
    begin,
    close: vi.fn(async () => undefined),
    finalize,
    get: vi.fn(async () => undefined),
    markTransportStarted,
  };
  return { begin, events, finalize, markTransportStarted, store };
};

const writeFactory: TaskVerificationFinalizationWriteFactory = ({
  attemptId,
  completedAt,
  evidence,
  identity,
  pointsAwarded,
  task,
}) => ({
  completion: {
    accountType: identity.issuedSubject.accountType,
    campaignId: task.campaignId,
    completedAt,
    createdAt: completedAt,
    evidenceHash: evidence.evidenceHash,
    evidenceId: `evidence-${attemptId}`,
    evidenceSource: evidence.evidenceSource,
    id: `completion-${attemptId}`,
    pointsAwarded,
    status: "completed",
    taskId: task.taskId,
    updatedAt: completedAt,
    verificationAttemptId: attemptId,
    walletAddress: identity.issuedSubject.walletAddress,
    walletSource: identity.issuedSubject.walletSource,
  },
  evidence: {
    accountType: identity.issuedSubject.accountType,
    campaignId: task.campaignId,
    capturedAt: completedAt,
    completionId: `completion-${attemptId}`,
    createdAt: completedAt,
    diagnosticCodes: [...evidence.diagnosticCodes],
    evidenceHash: evidence.evidenceHash,
    evidenceRef: evidence.evidenceRef,
    evidenceSource: evidence.evidenceSource,
    id: `evidence-${attemptId}`,
    liveContractExecuted: false,
    liveProviderExecuted: true,
    liveRewardExecuted: false,
    liveStorageExecuted: false,
    pointsAwarded,
    status: "completed",
    taskId: task.taskId,
    updatedAt: completedAt,
    verificationAttemptId: attemptId,
    walletAddress: identity.issuedSubject.walletAddress,
    walletSource: identity.issuedSubject.walletSource,
  },
  participant: {
    accountType: identity.issuedSubject.accountType,
    campaignId: task.campaignId,
    createdAt: completedAt,
    id: `participant-${attemptId}`,
    localePreference: "en-US",
    riskFlags: [],
    totalPoints: pointsAwarded,
    updatedAt: completedAt,
    walletAddress: identity.issuedSubject.walletAddress,
    walletSignatureStatus: "signed",
    walletSource: identity.issuedSubject.walletSource,
    walletTypeVerified: true,
  },
});

const createRuntime = (options: {
  runtimeConfig?: TaskVerificationConfig;
  store?: TaskVerificationAttemptStore;
  transport?: ProviderHttpTransport;
} = {}) => new TaskVerificationRuntime({
  attemptStore: options.store ?? fakeStore().store,
  config: options.runtimeConfig ?? config(),
  finalizationWriteFactory: writeFactory,
  now: () => "2026-07-16T00:00:01.000Z",
  providerHttpRuntime: providerRuntime,
  transport: options.transport ?? (() => successfulTransportResult()),
});

describe("task verification runtime", () => {
  it("executes begin -> mark -> one transport -> finalize and returns only committed completion", async () => {
    const events: string[] = [];
    const memory = createMemoryTaskVerificationAttemptStore({
      attemptId: () => "attempt-runtime-happy",
      now: () => "2026-07-16T00:00:00.000Z",
      ownerToken: () => "fake-owner-token-runtime",
      persistFinalization: async (write) => write,
    });
    const store: TaskVerificationAttemptStore = {
      begin: async (input) => {
        events.push("begin");
        return memory.begin(input);
      },
      close: () => memory.close(),
      finalize: async (input) => {
        events.push("finalize");
        return memory.finalize(input);
      },
      get: (attemptId, operationContext) => memory.get(attemptId, operationContext),
      markTransportStarted: async (input) => {
        events.push("mark");
        return memory.markTransportStarted(input);
      },
    };
    let transportCalls = 0;
    const runtime = createRuntime({
      store,
      transport: () => {
        events.push("transport");
        transportCalls += 1;
        return successfulTransportResult();
      },
    });
    const result = await runtime.execute({ ...authority(), traceId: TRACE_ID });

    expect(events).toEqual(["begin", "mark", "transport", "finalize"]);
    expect(transportCalls).toBe(1);
    expect(result).toMatchObject({
      authoritative: true,
      evidence: {
        evidenceHash: EVIDENCE_HASH,
        evidenceRef: "evidence-ref:fake-runtime-result",
      },
      outcome: "completed",
      pointsAwarded: 25,
      positiveMatch: true,
      transportExecuted: true,
    });
    expect(JSON.stringify(result)).not.toContain("fake-owner-token-runtime");
    expect(JSON.stringify(result)).not.toContain("ELF_FAKE_RUNTIME_WALLET");
  });

  it("binds canonical execution material to concrete fetch only after durable mark", async () => {
    const events: string[] = [];
    const fake = fakeStore({ events });
    const runtimeConfig = config();
    const providerBinding = runtimeConfig.bindings[0]!;
    let wireUrl = "";
    let wireBody: string | undefined;
    let wireHeaders: HeadersInit | undefined;
    const transport = createProviderHttpFetchTransport({
      fetch: (async (url, init) => {
        events.push("transport");
        wireUrl = url.toString();
        wireBody = init?.body?.toString();
        wireHeaders = init?.headers;
        return new Response(JSON.stringify({
          evidenceHash: EVIDENCE_HASH,
          evidenceRef: "evidence-ref:fake-runtime-result",
          status: "completed",
          verified: true,
        }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }) as typeof fetch,
      materialResolver: createProviderHttpExecutionMaterialResolver({
        binding: providerBinding,
        environment: "local",
        lookup: {
          get: (key) => key === ENDPOINT_KEY
            ? "http://127.0.0.1:4179/runtime-base?mode=fake"
            : undefined,
        },
      }),
    });
    const runtime = createRuntime({
      runtimeConfig,
      store: fake.store,
      transport,
    });

    const result = await runtime.execute({ ...authority(), traceId: TRACE_ID });

    expect(events).toEqual(["begin", "mark", "transport", "finalize"]);
    expect(wireUrl).toBe(
      "http://127.0.0.1:4179/runtime-base/participants/ELF_FAKE_RUNTIME_WALLET/tasks/task-runtime?mode=fake&chainId=chain-ref%3Afake-runtime",
    );
    expect(JSON.parse(wireBody ?? "{}")).toEqual({ taskRevision: 1 });
    expect(new Headers(wireHeaders).get("x-campaign-id")).toBe("campaign-runtime");
    expect(new Headers(wireHeaders).get("x-wallet-source")).toBe("PORTKEY_AA");
    expect(result).toMatchObject({ outcome: "completed", transportExecuted: true });
    expect(JSON.stringify(result)).not.toContain("ELF_FAKE_RUNTIME_WALLET");
    await expect(runtime.close()).resolves.toMatchObject({ status: "drained" });
  });

  it.each([
    ["existing_terminal", "completed", true],
    ["in_progress", "pending", false],
    ["recovery_required", "manual_review", false],
    ["blocked", "manual_review", false],
  ] as const)("projects begin %s without dispatch", async (beginKind, outcome, authoritative) => {
    const fake = fakeStore({ beginKind });
    let transportCalls = 0;
    const runtime = createRuntime({
      store: fake.store,
      transport: () => {
        transportCalls += 1;
        return successfulTransportResult();
      },
    });
    const result = await runtime.execute({ ...authority(), traceId: TRACE_ID });

    expect(result).toMatchObject({ authoritative, outcome });
    expect(transportCalls).toBe(0);
    expect(fake.markTransportStarted).not.toHaveBeenCalled();
    expect(fake.finalize).not.toHaveBeenCalled();
  });

  it("blocks invalid authority, disabled config, and missing transport before begin", async () => {
    const invalid = fakeStore();
    const disabled = fakeStore();
    const missingTransport = fakeStore();
    const validAuthority = authority();
    const forgedIdentity = { ...validAuthority.identity } as TaskVerificationIdentity;

    const invalidResult = await createRuntime({ store: invalid.store }).execute({
      identity: forgedIdentity,
      task: validAuthority.task,
      traceId: TRACE_ID,
    });
    const disabledResult = await createRuntime({
      runtimeConfig: config(false),
      store: disabled.store,
    }).execute({ ...validAuthority, traceId: TRACE_ID });
    const noTransportRuntime = new TaskVerificationRuntime({
      attemptStore: missingTransport.store,
      config: config(),
      finalizationWriteFactory: writeFactory,
      providerHttpRuntime: providerRuntime,
    });
    const missingResult = await noTransportRuntime.execute({ ...validAuthority, traceId: TRACE_ID });

    expect(invalidResult).toMatchObject({ diagnosticCodes: ["TASK_VERIFICATION_AUTHORITY_INVALID"] });
    expect(disabledResult).toMatchObject({ diagnosticCodes: ["TASK_VERIFICATION_CONFIG_BLOCKED"] });
    expect(missingResult).toMatchObject({ diagnosticCodes: ["TASK_VERIFICATION_TRANSPORT_MISSING"] });
    expect(invalid.begin).not.toHaveBeenCalled();
    expect(disabled.begin).not.toHaveBeenCalled();
    expect(missingTransport.begin).not.toHaveBeenCalled();
  });

  it.each(["stale_owner", "conflict", "terminal", "already_marked_same_owner"] as const)(
    "does not dispatch when mark returns %s",
    async (markKind) => {
      const fake = fakeStore({ markKind });
      let transportCalls = 0;
      const result = await createRuntime({
        store: fake.store,
        transport: () => {
          transportCalls += 1;
          return successfulTransportResult();
        },
      }).execute({ ...authority(), traceId: TRACE_ID });

      expect(result).toMatchObject({ outcome: "manual_review", transportExecuted: false });
      expect(transportCalls).toBe(0);
      expect(fake.finalize).not.toHaveBeenCalled();
    },
  );

  it("does not dispatch when mark throws and does not leak the thrown detail", async () => {
    const fake = fakeStore({ markThrows: true });
    let transportCalls = 0;
    const result = await createRuntime({
      store: fake.store,
      transport: () => {
        transportCalls += 1;
        return successfulTransportResult();
      },
    }).execute({ ...authority(), traceId: TRACE_ID });

    expect(result).toMatchObject({ diagnosticCodes: ["TASK_VERIFICATION_MARK_FAILED"] });
    expect(transportCalls).toBe(0);
    expect(JSON.stringify(result)).not.toContain("fake-token-mark-detail");
  });

  it("finalizes a thrown transport as an attempted dispatch without retrying", async () => {
    const fake = fakeStore();
    let transportCalls = 0;
    const result = await createRuntime({
      store: fake.store,
      transport: () => {
        transportCalls += 1;
        throw new Error("fake-token-after-provider-side-effect");
      },
    }).execute({ ...authority(), traceId: TRACE_ID });

    expect(transportCalls).toBe(1);
    expect(fake.finalize).toHaveBeenCalledTimes(1);
    expect(fake.finalize.mock.calls[0][0].transition).toMatchObject({
      status: "manual_review",
      transportExecuted: true,
    });
    expect(result).toMatchObject({
      outcome: "manual_review",
      transportExecuted: true,
    });
    expect(JSON.stringify(result)).not.toContain("fake-token-after-provider-side-effect");
  });

  it.each([
    ["positive", successfulTransportResult(), "completed", 25],
    ["negative", {
      body: { status: "completed", verified: false }, durationMs: 10, statusCode: 200, timedOut: false,
    }, "failed", 0],
    ["pending", {
      body: { status: "pending" }, durationMs: 10, statusCode: 202, timedOut: false,
    }, "pending", 0],
    ["timeout", {
      aborted: true, diagnostic: { code: "timeout", message: "safe", traceId: TRACE_ID }, durationMs: 100, timedOut: true,
    }, "pending", 0],
    ["rate-limit", {
      body: { status: "pending" }, durationMs: 10, statusCode: 429, timedOut: false,
    }, "pending", 0],
    ["unavailable", {
      body: { status: "unavailable" }, durationMs: 10, statusCode: 503, timedOut: false,
    }, "pending", 0],
    ["malformed", {
      diagnostic: { code: "malformed_json", message: "safe", traceId: TRACE_ID }, durationMs: 10, statusCode: 200, timedOut: false,
    }, "manual_review", 0],
    ["oversize", {
      diagnostic: { code: "response_too_large", message: "safe", traceId: TRACE_ID }, durationMs: 10, statusCode: 200, timedOut: false,
    }, "manual_review", 0],
    ["caller-abort", {
      aborted: true, diagnostic: { code: "caller_aborted", message: "safe", traceId: TRACE_ID }, durationMs: 10, timedOut: false,
    }, "pending", 0],
  ] as const)("finalizes transport %s as %s with zero non-completed points", async (
    _case,
    transportResult,
    expectedStatus,
    pointsAwarded,
  ) => {
    const fake = fakeStore();
    const result = await createRuntime({
      store: fake.store,
      transport: () => transportResult,
    }).execute({ ...authority(), traceId: TRACE_ID });

    expect(fake.finalize).toHaveBeenCalledTimes(1);
    expect(fake.finalize.mock.calls[0][0].transition.status).toBe(expectedStatus);
    expect(result).toMatchObject({ outcome: expectedStatus, pointsAwarded });
    if (expectedStatus !== "completed") {
      expect(result).not.toHaveProperty("evidence");
    }
  });

  it.each(["stale_owner", "conflict", "blocked"] as const)(
    "never returns optimistic completion when finalize returns %s",
    async (finalizeKind) => {
      const fake = fakeStore({ finalizeKind });
      let transportCalls = 0;
      const result = await createRuntime({
        store: fake.store,
        transport: () => {
          transportCalls += 1;
          return successfulTransportResult();
        },
      }).execute({ ...authority(), traceId: TRACE_ID });

      expect(transportCalls).toBe(1);
      expect(result).toMatchObject({ authoritative: false, outcome: "manual_review", pointsAwarded: 0 });
      expect(result).not.toHaveProperty("evidence");
    },
  );

  it("never returns optimistic completion or retries transport when finalize throws", async () => {
    const fake = fakeStore({ finalizeThrows: true });
    let transportCalls = 0;
    const result = await createRuntime({
      store: fake.store,
      transport: () => {
        transportCalls += 1;
        return successfulTransportResult();
      },
    }).execute({ ...authority(), traceId: TRACE_ID });

    expect(transportCalls).toBe(1);
    expect(result).toMatchObject({
      authoritative: false,
      diagnosticCodes: ["TASK_VERIFICATION_FINALIZE_FAILED"],
      outcome: "manual_review",
      pointsAwarded: 0,
    });
    expect(JSON.stringify(result)).not.toContain("fake-credential-finalize-detail");
  });

  it("coalesces concurrent execution of one identity into one durable dispatch", async () => {
    const fake = fakeStore();
    let releaseTransport: ((value: ProviderHttpTransportResult) => void) | undefined;
    const transportGate = new Promise<ProviderHttpTransportResult>((resolve) => {
      releaseTransport = resolve;
    });
    let transportCalls = 0;
    const runtime = createRuntime({
      store: fake.store,
      transport: async () => {
        transportCalls += 1;
        return transportGate;
      },
    });
    const input = { ...authority(), traceId: TRACE_ID };
    const executions = Array.from({ length: 12 }, () => runtime.execute(input));
    await vi.waitFor(() => expect(transportCalls).toBe(1));
    releaseTransport?.(successfulTransportResult());
    const results = await Promise.all(executions);

    expect(fake.begin).toHaveBeenCalledTimes(1);
    expect(fake.markTransportStarted).toHaveBeenCalledTimes(1);
    expect(fake.finalize).toHaveBeenCalledTimes(1);
    expect(results.every(({ outcome }) => outcome === "completed")).toBe(true);
  });

  it("rejects calls after stop with zero begin/mark/transport/finalize", async () => {
    const fake = fakeStore();
    let transportCalls = 0;
    const runtime = createRuntime({
      store: fake.store,
      transport: () => {
        transportCalls += 1;
        return successfulTransportResult();
      },
    });
    await runtime.close();
    const result = await runtime.execute({ ...authority(), traceId: TRACE_ID });

    expect(result).toMatchObject({ diagnosticCodes: ["TASK_VERIFICATION_RUNTIME_STOPPED"] });
    expect(fake.begin).not.toHaveBeenCalled();
    expect(fake.markTransportStarted).not.toHaveBeenCalled();
    expect(fake.finalize).not.toHaveBeenCalled();
    expect(transportCalls).toBe(0);
  });

  it("stops between begin and mark with zero dispatch", async () => {
    const base = fakeStore();
    let releaseBegin: ((value: BeginTaskVerificationAttemptResult) => void) | undefined;
    const beginGate = new Promise<BeginTaskVerificationAttemptResult>((resolve) => {
      releaseBegin = resolve;
    });
    base.store.begin = vi.fn(async () => beginGate);
    let transportCalls = 0;
    const runtime = createRuntime({
      store: base.store,
      transport: () => {
        transportCalls += 1;
        return successfulTransportResult();
      },
    });
    const execution = runtime.execute({ ...authority(), traceId: TRACE_ID });
    await vi.waitFor(() => expect(base.store.begin).toHaveBeenCalledTimes(1));
    const close = runtime.close();
    releaseBegin?.({ attempt: baseAttempt(), kind: "acquired", owner: { attemptId: "attempt-runtime", fence: 1 } });
    const result = await execution;
    await close;

    expect(result).toMatchObject({ outcome: "pending", transportExecuted: false });
    expect(base.markTransportStarted).not.toHaveBeenCalled();
    expect(base.finalize).not.toHaveBeenCalled();
    expect(transportCalls).toBe(0);
  });

  it("aborts during transport, then finalizes the safe pending result before draining", async () => {
    const fake = fakeStore();
    const transport: ProviderHttpTransport = (_request, transportContext) =>
      new Promise((resolve) => {
        transportContext.runtimeSignal?.addEventListener("abort", () => resolve({
          aborted: true,
          diagnostic: { code: "runtime_aborted", message: "safe", traceId: TRACE_ID },
          durationMs: 10,
          timedOut: false,
        }), { once: true });
      });
    const runtime = createRuntime({ store: fake.store, transport });
    const execution = runtime.execute({ ...authority(), traceId: TRACE_ID });
    await vi.waitFor(() => expect(fake.markTransportStarted).toHaveBeenCalledTimes(1));
    const close = runtime.close();
    const result = await execution;
    const closeResult = await close;

    expect(fake.finalize).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ outcome: "pending", transportExecuted: true });
    expect(closeResult).toMatchObject({ activeCallCount: 0, status: "drained" });
    expect(runtime.state()).toMatchObject({ accepting: false, activeCallCount: 0 });
  });

  it("returns a bounded close timeout and releases runtime controller ownership", async () => {
    const fake = fakeStore();
    let releaseFinalize: (() => void) | undefined;
    const finalizeGate = new Promise<void>((resolve) => {
      releaseFinalize = resolve;
    });
    fake.store.finalize = vi.fn(async (input) => {
      await finalizeGate;
      return {
        attempt: baseAttempt({ dispatchState: "result_observed", status: input.transition.status }),
        kind: "committed" as const,
      };
    });
    const runtime = new TaskVerificationRuntime({
      attemptStore: fake.store,
      config: config(),
      drainTimeoutMs: 10,
      finalizationWriteFactory: writeFactory,
      now: () => "2026-07-16T00:00:01.000Z",
      providerHttpRuntime: providerRuntime,
      transport: () => successfulTransportResult(),
    });
    const execution = runtime.execute({ ...authority(), traceId: TRACE_ID });
    await vi.waitFor(() => expect(fake.store.finalize).toHaveBeenCalledTimes(1));
    const closeResult = await runtime.close();

    expect(closeResult).toMatchObject({ activeCallCount: 0, status: "timed_out" });
    expect(runtime.state()).toMatchObject({ activeCallCount: 0, controllerCount: 0 });
    releaseFinalize?.();
    await execution;
    await expect(runtime.close()).resolves.toEqual(closeResult);
  });
});
