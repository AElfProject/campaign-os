import { describe, expect, it } from "vitest";
import {
  TASK_VERIFICATION_EVIDENCE_HASH_LENGTH,
  TASK_VERIFICATION_MAX_DIAGNOSTIC_CODE_LENGTH,
  TASK_VERIFICATION_MAX_EVIDENCE_REF_LENGTH,
  TASK_VERIFICATION_MAX_REVISION,
  TASK_VERIFICATION_MAX_TRACE_ID_LENGTH,
  TaskVerificationDomainError,
  canonicalizeTaskVerificationRule,
  createCanonicalTaskVerificationRevision,
  deriveTaskVerificationIdentity,
  isTaskVerificationAttemptStatus,
  isTaskVerificationOutcomeStatus,
  isTaskVerificationTerminalStatus,
  resolveTaskVerificationExecutionPosture,
  transitionTaskVerificationAttempt,
  type TaskVerificationRevisionInput,
} from "./taskVerification";

const TRACE_ID = "trace-wp01-domain";

const revisionInput = (
  overrides: Partial<TaskVerificationRevisionInput> = {},
): TaskVerificationRevisionInput => ({
  campaignId: "campaign-live-provider",
  evidenceRule: {
    minAmount: 1,
    providerBindingId: "binding-on-chain-default",
    source: "AELFSCAN",
    tags: ["transfer", "bridge"],
  },
  points: 25,
  required: true,
  revision: 1,
  taskId: "task-verify-transfer",
  traceId: TRACE_ID,
  updatedAt: "2026-07-16T00:00:00.000Z",
  verificationType: "ON_CHAIN",
  walletPolicy: "ANY",
  ...overrides,
});

const canonicalTask = () => createCanonicalTaskVerificationRevision(revisionInput());

const completedTransition = () => ({
  bindingEnabled: true,
  currentStatus: "running" as const,
  diagnosticCodes: [] as string[],
  evidence: {
    diagnosticCodes: [] as string[],
    evidenceHash: "a".repeat(TASK_VERIFICATION_EVIDENCE_HASH_LENGTH),
    evidenceRef: "provider-record:transfer-123",
    evidenceSource: "AELFSCAN" as const,
    traceId: TRACE_ID,
  },
  positiveMatch: true,
  targetStatus: "completed" as const,
  traceId: TRACE_ID,
  transportExecuted: true,
});

const captureDomainError = (run: () => unknown): TaskVerificationDomainError => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(TaskVerificationDomainError);
    return error as TaskVerificationDomainError;
  }

  throw new Error("Expected TaskVerificationDomainError.");
};

describe("task verification canonical revision", () => {
  it.each([0, -1, 1.5, TASK_VERIFICATION_MAX_REVISION + 1])(
    "rejects invalid revision %s without echoing the raw value",
    (revision) => {
      const error = captureDomainError(() =>
        createCanonicalTaskVerificationRevision(revisionInput({ revision })),
      );

      expect(error).toMatchObject({
        code: revision > TASK_VERIFICATION_MAX_REVISION
          ? "TASK_VERIFICATION_BOUND_EXCEEDED"
          : "TASK_VERIFICATION_INVALID_INPUT",
        field: "revision",
        traceId: TRACE_ID,
      });
      expect(error.message).not.toContain(String(revision));
      expect(error.stack).toBeUndefined();
    },
  );

  it.each([1, TASK_VERIFICATION_MAX_REVISION])(
    "accepts canonical positive revision boundary %s",
    (revision) => {
      const task = createCanonicalTaskVerificationRevision(revisionInput({ revision }));

      expect(task.revision).toBe(revision);
      expect(task.taskRevisionDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(task.evidenceRuleDigest).toMatch(/^[a-f0-9]{64}$/);
    },
  );

  it("canonicalizes object keys, set-like arrays, and insignificant string whitespace", () => {
    const first = createCanonicalTaskVerificationRevision(revisionInput({
      evidenceRule: {
        source: " AELFSCAN ",
        tags: ["transfer", "bridge", "bridge"],
        providerBindingId: "binding-on-chain-default",
        minAmount: 1,
      },
    }));
    const second = createCanonicalTaskVerificationRevision(revisionInput({
      evidenceRule: {
        minAmount: 1,
        providerBindingId: "binding-on-chain-default",
        source: "AELFSCAN",
        tags: ["bridge", "transfer"],
      },
    }));

    expect(first.evidenceRule).toEqual(second.evidenceRule);
    expect(first.evidenceRuleDigest).toBe(second.evidenceRuleDigest);
    expect(first.taskRevisionDigest).toBe(second.taskRevisionDigest);
    expect(first.evidenceRule.tags).toEqual(["bridge", "transfer"]);
  });

  it("uses locale-independent code-unit ordering for set-like arrays", () => {
    const projection = canonicalizeTaskVerificationRule({
      tags: ["\u00e4", "z", "A"],
    }, { traceId: TRACE_ID });

    expect(projection.value.tags).toEqual(["A", "z", "\u00e4"]);
  });

  it.each([
    ["revision", { revision: 2 }],
    ["updatedAt", { updatedAt: "2026-07-16T00:00:01.000Z" }],
    ["verificationType", { verificationType: "DAPP_API" as const }],
    ["points", { points: 26 }],
    ["required", { required: false }],
    ["walletPolicy", { walletPolicy: "AA_ONLY" as const }],
    ["evidenceRule", { evidenceRule: { source: "AEFINDER", minAmount: 1 } }],
  ])("changes the revision identity when %s changes", (_field, overrides) => {
    const baseline = canonicalTask();
    const changed = createCanonicalTaskVerificationRevision(revisionInput(overrides));

    expect(changed.taskRevisionDigest).not.toBe(baseline.taskRevisionDigest);
  });

  it("rejects unknown trusted fields", () => {
    const input = { ...revisionInput(), provider: "client-selected" };
    const error = captureDomainError(() => createCanonicalTaskVerificationRevision(input));

    expect(error).toMatchObject({
      code: "TASK_VERIFICATION_INVALID_INPUT",
      field: "input",
    });
  });
});

describe("task verification evidence-rule safety", () => {
  it.each([
    ["secret-like key", { authorizationHeader: "redacted" }],
    ["nested URL", { source: { url: "https://provider.invalid" } }],
    ["URL value", { source: "https://provider.invalid/fact" }],
    ["header value", { source: "Bearer credential-material" }],
    ["function", { source: () => "AELFSCAN" }],
    ["symbol", { source: Symbol("AELFSCAN") }],
    ["undefined", { source: undefined }],
    ["NaN", { minAmount: Number.NaN }],
    ["Infinity", { minAmount: Number.POSITIVE_INFINITY }],
    ["control character", { source: "AELF\nSCAN" }],
    ["oversized string", { source: "x".repeat(257) }],
  ])("rejects %s", (_label, evidenceRule) => {
    const error = captureDomainError(() =>
      canonicalizeTaskVerificationRule(evidenceRule, { traceId: TRACE_ID }),
    );

    expect([
      "TASK_VERIFICATION_BOUND_EXCEEDED",
      "TASK_VERIFICATION_UNSAFE_RULE",
    ]).toContain(error.code);
    expect(error.message).not.toContain("provider.invalid");
    expect(error.message).not.toContain("credential-material");
  });

  it("rejects cyclic and over-wide rules without recursing into caller data", () => {
    const cyclic: Record<string, unknown> = { source: "AELFSCAN" };
    cyclic.self = cyclic;
    const wide = Object.fromEntries(
      Array.from({ length: 33 }, (_, index) => [`field${index}`, index]),
    );

    expect(() => canonicalizeTaskVerificationRule(cyclic, { traceId: TRACE_ID })).toThrow(
      TaskVerificationDomainError,
    );
    expect(captureDomainError(() =>
      canonicalizeTaskVerificationRule(wide, { traceId: TRACE_ID }),
    ).code).toBe("TASK_VERIFICATION_BOUND_EXCEEDED");
  });

  it("rejects symbol, hidden, and accessor fields without invoking accessors", () => {
    const withSymbol = { source: "AELFSCAN" } as Record<PropertyKey, unknown>;
    withSymbol[Symbol("secret")] = "raw-secret";
    const withHidden = { source: "AELFSCAN" };
    Object.defineProperty(withHidden, "hiddenToken", {
      enumerable: false,
      value: "raw-secret",
    });
    let accessorReads = 0;
    const withAccessor = {};
    Object.defineProperty(withAccessor, "source", {
      enumerable: true,
      get: () => {
        accessorReads += 1;
        return "AELFSCAN";
      },
    });

    for (const evidenceRule of [withSymbol, withHidden, withAccessor]) {
      expect(() => canonicalizeTaskVerificationRule(evidenceRule, {
        traceId: TRACE_ID,
      })).toThrow(TaskVerificationDomainError);
    }
    expect(accessorReads).toBe(0);
  });
});

describe("task verification server-derived identity", () => {
  const trustedInput = () => ({
    binding: {
      bindingId: "binding-on-chain-default",
      bindingRevision: 1,
    },
    issuedSubject: {
      accountType: "AA" as const,
      sessionRef: "session-issued-123",
      walletAddress: "ELF_2M7wIssuedWallet_AELF",
      walletSource: "PORTKEY_AA" as const,
    },
    task: canonicalTask(),
    traceId: TRACE_ID,
  });

  it("is stable and ignores untrusted client provider, binding, identity, and lease claims", () => {
    const first = deriveTaskVerificationIdentity(trustedInput(), {
      bindingId: "client-binding",
      evidenceHash: "client-evidence",
      idempotencyKey: "client-key",
      leaseToken: "client-lease",
      points: 1_000_000,
      provider: "client-provider",
      walletAddress: "client-wallet",
    });
    const second = deriveTaskVerificationIdentity(trustedInput(), {
      bindingId: "another-client-binding",
      idempotencyKey: "another-client-key",
    });

    expect(first).toEqual(second);
    expect(first.idempotencyKey).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(first)).not.toContain("client-");
  });

  it.each([
    ["campaign", (input: ReturnType<typeof trustedInput>) => ({
      ...input,
      task: createCanonicalTaskVerificationRevision(revisionInput({ campaignId: "campaign-other" })),
    })],
    ["task", (input: ReturnType<typeof trustedInput>) => ({
      ...input,
      task: createCanonicalTaskVerificationRevision(revisionInput({ taskId: "task-other" })),
    })],
    ["revision", (input: ReturnType<typeof trustedInput>) => ({
      ...input,
      task: createCanonicalTaskVerificationRevision(revisionInput({ revision: 2 })),
    })],
    ["wallet", (input: ReturnType<typeof trustedInput>) => ({
      ...input,
      issuedSubject: { ...input.issuedSubject, walletAddress: "ELF_OtherWallet_AELF" },
    })],
    ["account", (input: ReturnType<typeof trustedInput>) => ({
      ...input,
      issuedSubject: { ...input.issuedSubject, accountType: "EOA" as const },
    })],
    ["source", (input: ReturnType<typeof trustedInput>) => ({
      ...input,
      issuedSubject: { ...input.issuedSubject, walletSource: "NIGHTELF" as const },
    })],
    ["binding", (input: ReturnType<typeof trustedInput>) => ({
      ...input,
      binding: { ...input.binding, bindingId: "binding-other" },
    })],
  ])("changes when trusted %s identity changes", (_label, change) => {
    const baseline = deriveTaskVerificationIdentity(trustedInput());
    const changed = deriveTaskVerificationIdentity(change(trustedInput()));

    expect(changed.idempotencyKey).not.toBe(baseline.idempotencyKey);
  });

  it("does not make session rotation a second provider identity", () => {
    const first = deriveTaskVerificationIdentity(trustedInput());
    const rotated = trustedInput();
    rotated.issuedSubject.sessionRef = "session-issued-rotated";

    expect(deriveTaskVerificationIdentity(rotated).idempotencyKey).toBe(first.idempotencyKey);
  });
});

describe("task verification attempt state machine", () => {
  it.each([
    ["requested", "running"],
    ["running", "pending"],
    ["running", "completed"],
    ["running", "failed"],
    ["running", "manual_review"],
    ["pending", "running"],
    ["pending", "failed"],
    ["pending", "manual_review"],
  ] as const)("allows %s -> %s", (currentStatus, targetStatus) => {
    const transition = targetStatus === "completed"
      ? completedTransition()
      : {
        bindingEnabled: true,
        currentStatus,
        diagnosticCodes: targetStatus === "running" ? [] : ["SAFE_PROVIDER_POSTURE"],
        positiveMatch: false,
        targetStatus,
        traceId: TRACE_ID,
        transportExecuted: currentStatus === "running" || currentStatus === "pending",
      };

    expect(transitionTaskVerificationAttempt(transition).status).toBe(targetStatus);
  });

  it.each([
    ["requested", "completed"],
    ["requested", "failed"],
    ["pending", "completed"],
    ["completed", "pending"],
    ["completed", "failed"],
    ["completed", "manual_review"],
    ["failed", "running"],
    ["manual_review", "running"],
    ["running", "requested"],
    ["running", "running"],
  ] as const)("rejects %s -> %s", (currentStatus, targetStatus) => {
    const error = captureDomainError(() => transitionTaskVerificationAttempt({
      ...completedTransition(),
      currentStatus,
      targetStatus,
    }));

    expect(error.code).toBe("TASK_VERIFICATION_INVALID_TRANSITION");
  });

  it.each([
    ["disabled binding", { bindingEnabled: false }],
    ["negative matcher", { positiveMatch: false }],
    ["transport not executed", { transportExecuted: false }],
    ["missing evidence", { evidence: undefined }],
    ["missing evidence hash", {
      evidence: { ...completedTransition().evidence, evidenceHash: "" },
    }],
  ])("rejects completed with %s", (_label, override) => {
    const error = captureDomainError(() => transitionTaskVerificationAttempt({
      ...completedTransition(),
      ...override,
    }));

    expect(error.code).toBe("TASK_VERIFICATION_INVALID_COMPLETED_OUTCOME");
  });

  it("rejects evidence attached to non-completed outcomes", () => {
    const error = captureDomainError(() => transitionTaskVerificationAttempt({
      ...completedTransition(),
      targetStatus: "failed",
    }));

    expect(error).toMatchObject({
      code: "TASK_VERIFICATION_INVALID_OUTCOME",
      field: "evidence",
    });
  });

  it("exports exhaustive attempt and outcome guards", () => {
    expect(isTaskVerificationAttemptStatus("requested")).toBe(true);
    expect(isTaskVerificationAttemptStatus("unknown")).toBe(false);
    expect(isTaskVerificationOutcomeStatus("completed")).toBe(true);
    expect(isTaskVerificationOutcomeStatus("running")).toBe(false);
    expect(isTaskVerificationTerminalStatus("completed")).toBe(true);
    expect(isTaskVerificationTerminalStatus("failed")).toBe(true);
    expect(isTaskVerificationTerminalStatus("manual_review")).toBe(true);
    expect(isTaskVerificationTerminalStatus("pending")).toBe(false);
  });
});

describe("task verification safe evidence bounds", () => {
  it("accepts each safe field at its exact boundary", () => {
    const diagnosticCode = `D${"A".repeat(TASK_VERIFICATION_MAX_DIAGNOSTIC_CODE_LENGTH - 1)}`;
    const result = transitionTaskVerificationAttempt({
      ...completedTransition(),
      diagnosticCodes: [diagnosticCode],
      evidence: {
        diagnosticCodes: [diagnosticCode],
        evidenceHash: "b".repeat(TASK_VERIFICATION_EVIDENCE_HASH_LENGTH),
        evidenceRef: "r".repeat(TASK_VERIFICATION_MAX_EVIDENCE_REF_LENGTH),
        evidenceSource: "AEFINDER",
        traceId: `t${"r".repeat(TASK_VERIFICATION_MAX_TRACE_ID_LENGTH - 1)}`,
      },
      traceId: `t${"r".repeat(TASK_VERIFICATION_MAX_TRACE_ID_LENGTH - 1)}`,
    });

    expect(result.evidence).toMatchObject({
      diagnosticCodes: [diagnosticCode],
      evidenceSource: "AEFINDER",
    });
  });

  it.each([
    ["hash", { evidenceHash: "a".repeat(TASK_VERIFICATION_EVIDENCE_HASH_LENGTH + 1) }],
    ["ref", { evidenceRef: "r".repeat(TASK_VERIFICATION_MAX_EVIDENCE_REF_LENGTH + 1) }],
    ["diagnostic", {
      diagnosticCodes: [`D${"A".repeat(TASK_VERIFICATION_MAX_DIAGNOSTIC_CODE_LENGTH)}`],
    }],
    ["trace", { traceId: `t${"r".repeat(TASK_VERIFICATION_MAX_TRACE_ID_LENGTH)}` }],
  ])("rejects %s at limit + 1", (_label, evidenceOverride) => {
    const error = captureDomainError(() => transitionTaskVerificationAttempt({
      ...completedTransition(),
      evidence: { ...completedTransition().evidence, ...evidenceOverride },
    }));

    expect([
      "TASK_VERIFICATION_BOUND_EXCEEDED",
      "TASK_VERIFICATION_INVALID_COMPLETED_OUTCOME",
    ]).toContain(error.code);
  });

  it.each([
    "https://provider.invalid/evidence",
    "../private/evidence.json",
    "token:raw-secret",
    "provider record with spaces",
  ])("rejects unsafe evidence reference %s", (evidenceRef) => {
    const error = captureDomainError(() => transitionTaskVerificationAttempt({
      ...completedTransition(),
      evidence: { ...completedTransition().evidence, evidenceRef },
    }));

    expect(error.code).toBe("TASK_VERIFICATION_INVALID_COMPLETED_OUTCOME");
    expect(error.message).not.toContain(evidenceRef);
  });
});

describe("task verification execution posture", () => {
  it.each([
    ["ON_CHAIN", "live_provider", true, true, undefined],
    ["DAPP_API", "live_provider", true, true, undefined],
    ["SOCIAL", "manual_review", false, false, "manual_review"],
    ["MANUAL", "manual_review", false, false, "manual_review"],
    ["WALLET", "issued_authority", false, false, undefined],
  ] as const)(
    "maps %s to %s without provider-name branches",
    (verificationType, posture, bindingRequired, transportAllowed, defaultOutcome) => {
      expect(resolveTaskVerificationExecutionPosture(verificationType)).toEqual({
        bindingRequired,
        defaultOutcome,
        posture,
        transportAllowed,
      });
    },
  );
});

describe("task verification immutable projections", () => {
  it("defensively copies and freezes caller-owned inputs", () => {
    const tags = ["transfer", "bridge"];
    const input = revisionInput({
      evidenceRule: { source: "AELFSCAN", tags },
    });
    const task = createCanonicalTaskVerificationRevision(input);
    const identity = deriveTaskVerificationIdentity({
      binding: { bindingId: "binding-on-chain-default", bindingRevision: 1 },
      issuedSubject: {
        accountType: "AA",
        sessionRef: "session-issued-123",
        walletAddress: "ELF_2M7wIssuedWallet_AELF",
        walletSource: "PORTKEY_AA",
      },
      task,
      traceId: TRACE_ID,
    });
    const transition = transitionTaskVerificationAttempt(completedTransition());

    tags.push("mutated-after-call");
    input.evidenceRule.source = "MUTATED";

    expect(task.evidenceRule).toEqual({ source: "AELFSCAN", tags: ["bridge", "transfer"] });
    expect(Object.isFrozen(task)).toBe(true);
    expect(Object.isFrozen(task.evidenceRule)).toBe(true);
    expect(Object.isFrozen(task.evidenceRule.tags)).toBe(true);
    expect(Object.isFrozen(identity)).toBe(true);
    expect(Object.isFrozen(identity.issuedSubject)).toBe(true);
    expect(Object.isFrozen(transition)).toBe(true);
    expect(Object.isFrozen(transition.evidence)).toBe(true);
  });
});
