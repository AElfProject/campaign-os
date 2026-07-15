import { createHash } from "node:crypto";
import type {
  AccountType,
  VerificationType,
  WalletPolicy,
  WalletSource,
} from "../domain/types";

export const TASK_VERIFICATION_MAX_REVISION = 2_147_483_647;
export const TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT = 1 as const;
export const TASK_VERIFICATION_MAX_OWNERSHIP_ATTEMPTS = 3 as const;
export const TASK_VERIFICATION_EVIDENCE_HASH_LENGTH = 64;
export const TASK_VERIFICATION_MAX_EVIDENCE_REF_LENGTH = 256;
export const TASK_VERIFICATION_MAX_DIAGNOSTIC_CODE_LENGTH = 64;
export const TASK_VERIFICATION_MAX_TRACE_ID_LENGTH = 128;

const MAX_SAFE_ID_LENGTH = 160;
const MAX_WALLET_ADDRESS_LENGTH = 192;
const MAX_RULE_KEYS = 32;
const MAX_RULE_KEY_LENGTH = 64;
const MAX_RULE_ARRAY_ITEMS = 32;
const MAX_RULE_STRING_LENGTH = 256;
const MAX_RULE_CANONICAL_BYTES = 8 * 1024;
const MAX_TASK_POINTS = 1_000_000_000;
const MAX_DIAGNOSTIC_CODES = 16;
const MAX_SAFE_RULE_NUMBER = 1_000_000_000_000_000;

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const SAFE_WALLET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const SAFE_RULE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]*$/;
const SAFE_DIAGNOSTIC_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const SHA_256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_EVIDENCE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const UNSAFE_RULE_KEY_PATTERN = /(authorization|credential|endpoint|header|password|payload|requestbody|responsebody|secret|signedurl|token|uri|url)/i;
const UNSAFE_RULE_VALUE_PATTERN = /(?:https?|wss?):\/\/|(?:^|\s)bearer\s|authorization\s*[:=]|[?&](?:api[_-]?key|signature|token)=/i;
const UNSAFE_EVIDENCE_REF_SEGMENT_PATTERN = /(?:^|[._:-])(?:authorization|credential|header|password|payload|secret|token|uri|url)(?:$|[._:-])/i;

const VERIFICATION_TYPES = [
  "WALLET",
  "ON_CHAIN",
  "DAPP_API",
  "SOCIAL",
  "MANUAL",
] as const satisfies readonly VerificationType[];
const WALLET_POLICIES = ["ANY", "AA_ONLY", "EOA_ONLY"] as const satisfies readonly WalletPolicy[];
const ACCOUNT_TYPES = ["AA", "EOA", "UNKNOWN"] as const satisfies readonly AccountType[];
const WALLET_SOURCES = [
  "PORTKEY_AA",
  "PORTKEY_EOA_APP",
  "PORTKEY_EOA_EXTENSION",
  "NIGHTELF",
  "AGENT_SKILL",
  "OTHER",
] as const satisfies readonly WalletSource[];

export const taskVerificationAttemptStatuses = [
  "requested",
  "running",
  "pending",
  "completed",
  "failed",
  "manual_review",
] as const;
export type TaskVerificationAttemptStatus = (typeof taskVerificationAttemptStatuses)[number];

export const taskVerificationOutcomeStatuses = [
  "pending",
  "completed",
  "failed",
  "manual_review",
] as const;
export type TaskVerificationOutcomeStatus = (typeof taskVerificationOutcomeStatuses)[number];

export const taskVerificationTerminalStatuses = [
  "completed",
  "failed",
  "manual_review",
] as const;
export type TaskVerificationTerminalStatus = (typeof taskVerificationTerminalStatuses)[number];

export type TaskVerificationDomainErrorCode =
  | "TASK_VERIFICATION_BOUND_EXCEEDED"
  | "TASK_VERIFICATION_INVALID_COMPLETED_OUTCOME"
  | "TASK_VERIFICATION_INVALID_IDENTITY"
  | "TASK_VERIFICATION_INVALID_INPUT"
  | "TASK_VERIFICATION_INVALID_OUTCOME"
  | "TASK_VERIFICATION_INVALID_TRANSITION"
  | "TASK_VERIFICATION_UNSAFE_RULE";

const SAFE_ERROR_MESSAGES: Readonly<Record<TaskVerificationDomainErrorCode, string>> = Object.freeze({
  TASK_VERIFICATION_BOUND_EXCEEDED: "Task verification domain bound was exceeded.",
  TASK_VERIFICATION_INVALID_COMPLETED_OUTCOME: "Task verification completed outcome is invalid.",
  TASK_VERIFICATION_INVALID_IDENTITY: "Task verification identity is invalid.",
  TASK_VERIFICATION_INVALID_INPUT: "Task verification input is invalid.",
  TASK_VERIFICATION_INVALID_OUTCOME: "Task verification outcome is invalid.",
  TASK_VERIFICATION_INVALID_TRANSITION: "Task verification state transition is invalid.",
  TASK_VERIFICATION_UNSAFE_RULE: "Task verification rule is unsafe.",
});

export class TaskVerificationDomainError extends Error {
  readonly code: TaskVerificationDomainErrorCode;
  readonly field: string;
  readonly traceId: string;

  constructor(options: {
    code: TaskVerificationDomainErrorCode;
    field: string;
    traceId: string;
  }) {
    super(SAFE_ERROR_MESSAGES[options.code]);
    this.name = "TaskVerificationDomainError";
    this.code = options.code;
    this.field = safeContextValue(options.field, "input", MAX_SAFE_ID_LENGTH);
    this.traceId = safeContextValue(
      options.traceId,
      "trace-unavailable",
      TASK_VERIFICATION_MAX_TRACE_ID_LENGTH,
    );
    delete this.stack;
  }
}

interface ErrorContext {
  field: string;
  traceId: string;
}

const fail = (code: TaskVerificationDomainErrorCode, context: ErrorContext): never => {
  throw new TaskVerificationDomainError({ code, ...context });
};

export type TaskVerificationRulePrimitive = string | number | boolean;
export type TaskVerificationRuleValue =
  | TaskVerificationRulePrimitive
  | readonly TaskVerificationRulePrimitive[];
export type CanonicalTaskVerificationRule = Readonly<Record<string, TaskVerificationRuleValue>>;

export interface TaskVerificationRuleProjection {
  readonly canonicalJson: string;
  readonly digest: string;
  readonly value: CanonicalTaskVerificationRule;
}

export interface TaskVerificationRevisionInput {
  campaignId: string;
  evidenceRule: Record<string, unknown>;
  points: number;
  required: boolean;
  revision: number;
  taskId: string;
  traceId: string;
  updatedAt: string;
  verificationType: VerificationType;
  walletPolicy: WalletPolicy;
}

export interface CanonicalTaskVerificationRevision {
  readonly campaignId: string;
  readonly evidenceRule: CanonicalTaskVerificationRule;
  readonly evidenceRuleDigest: string;
  readonly points: number;
  readonly required: boolean;
  readonly revision: number;
  readonly taskId: string;
  readonly taskRevisionDigest: string;
  readonly updatedAt: string;
  readonly verificationType: VerificationType;
  readonly walletPolicy: WalletPolicy;
}

export interface IssuedTaskVerificationSubjectInput {
  accountType: AccountType;
  sessionRef: string;
  walletAddress: string;
  walletSource: WalletSource;
}

export interface TaskVerificationBindingIdentityInput {
  bindingId: string;
  bindingRevision: number;
}

export interface TrustedTaskVerificationIdentityInput {
  binding: TaskVerificationBindingIdentityInput;
  issuedSubject: IssuedTaskVerificationSubjectInput;
  task: CanonicalTaskVerificationRevision;
  traceId: string;
}

export interface TaskVerificationIdentity {
  readonly binding: Readonly<TaskVerificationBindingIdentityInput>;
  readonly campaignId: string;
  readonly evidenceRuleDigest: string;
  readonly externalDispatchLimit: typeof TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT;
  readonly idempotencyKey: string;
  readonly issuedSubject: Readonly<IssuedTaskVerificationSubjectInput>;
  readonly taskId: string;
  readonly taskRevision: number;
  readonly taskRevisionDigest: string;
}

export type TaskVerificationEvidenceSource = "AEFINDER" | "AELFSCAN" | "DAPP_API";

export interface TaskVerificationSafeEvidenceInput {
  diagnosticCodes: readonly string[];
  evidenceHash: string;
  evidenceRef: string;
  evidenceSource: TaskVerificationEvidenceSource;
  traceId: string;
}

export interface TaskVerificationSafeEvidence {
  readonly diagnosticCodes: readonly string[];
  readonly evidenceHash: string;
  readonly evidenceRef: string;
  readonly evidenceSource: TaskVerificationEvidenceSource;
  readonly traceId: string;
}

export interface TaskVerificationTransitionInput {
  bindingEnabled: boolean;
  currentStatus: TaskVerificationAttemptStatus;
  diagnosticCodes: readonly string[];
  evidence?: TaskVerificationSafeEvidenceInput;
  positiveMatch: boolean;
  targetStatus: TaskVerificationAttemptStatus;
  traceId: string;
  transportExecuted: boolean;
}

export interface TaskVerificationTransition {
  readonly bindingEnabled: boolean;
  readonly diagnosticCodes: readonly string[];
  readonly evidence?: TaskVerificationSafeEvidence;
  readonly positiveMatch: boolean;
  readonly previousStatus: TaskVerificationAttemptStatus;
  readonly status: TaskVerificationAttemptStatus;
  readonly terminal: boolean;
  readonly traceId: string;
  readonly transportExecuted: boolean;
}

export type TaskVerificationExecutionPosture =
  | "issued_authority"
  | "live_provider"
  | "manual_review";

export interface TaskVerificationExecutionResolution {
  readonly bindingRequired: boolean;
  readonly defaultOutcome: "manual_review" | undefined;
  readonly posture: TaskVerificationExecutionPosture;
  readonly transportAllowed: boolean;
}

const ATTEMPT_TRANSITIONS: Readonly<Record<TaskVerificationAttemptStatus, ReadonlySet<TaskVerificationAttemptStatus>>> =
  Object.freeze({
    completed: new Set<TaskVerificationAttemptStatus>(),
    failed: new Set<TaskVerificationAttemptStatus>(),
    manual_review: new Set<TaskVerificationAttemptStatus>(),
    pending: new Set<TaskVerificationAttemptStatus>(["running", "failed", "manual_review"]),
    requested: new Set<TaskVerificationAttemptStatus>(["running"]),
    running: new Set<TaskVerificationAttemptStatus>([
      "completed",
      "failed",
      "manual_review",
      "pending",
    ]),
  });

const EXECUTION_POSTURES: Readonly<Record<VerificationType, TaskVerificationExecutionResolution>> =
  Object.freeze({
    DAPP_API: frozenExecutionResolution("live_provider", true, true),
    MANUAL: frozenExecutionResolution("manual_review", false, false, "manual_review"),
    ON_CHAIN: frozenExecutionResolution("live_provider", true, true),
    SOCIAL: frozenExecutionResolution("manual_review", false, false, "manual_review"),
    WALLET: frozenExecutionResolution("issued_authority", false, false),
  });

export const canonicalizeTaskVerificationRule = (
  evidenceRule: unknown,
  context: { traceId: string },
): TaskVerificationRuleProjection => {
  const traceId = assertTraceId(context.traceId, "traceId", context.traceId);
  const record = assertPlainRecord(evidenceRule, "evidenceRule", traceId, "TASK_VERIFICATION_UNSAFE_RULE");
  const keys = Object.keys(record).sort();

  if (keys.length === 0) {
    return fail("TASK_VERIFICATION_UNSAFE_RULE", { field: "evidenceRule", traceId });
  }
  if (keys.length > MAX_RULE_KEYS) {
    return fail("TASK_VERIFICATION_BOUND_EXCEEDED", { field: "evidenceRule", traceId });
  }

  const canonicalEntries = keys.map((key) => {
    assertRuleKey(key, traceId);
    return [key, canonicalizeRuleValue(record[key], `evidenceRule.${key}`, traceId)] as const;
  });
  const value = Object.freeze(Object.fromEntries(canonicalEntries)) as CanonicalTaskVerificationRule;
  const canonicalJson = serializeCanonicalRecord(value);

  if (Buffer.byteLength(canonicalJson, "utf8") > MAX_RULE_CANONICAL_BYTES) {
    return fail("TASK_VERIFICATION_BOUND_EXCEEDED", { field: "evidenceRule", traceId });
  }

  return Object.freeze({
    canonicalJson,
    digest: versionedSha256("campaign-os/task-verification-evidence-rule/v1", canonicalJson),
    value,
  });
};

export const createCanonicalTaskVerificationRevision = (
  input: unknown,
): CanonicalTaskVerificationRevision => {
  const traceId = traceIdFromUnknown(input);
  const record = assertExactRecord(input, [
    "campaignId",
    "evidenceRule",
    "points",
    "required",
    "revision",
    "taskId",
    "traceId",
    "updatedAt",
    "verificationType",
    "walletPolicy",
  ], "input", traceId);
  const validatedTraceId = assertTraceId(record.traceId, "traceId", traceId);
  const campaignId = assertSafeId(record.campaignId, "campaignId", validatedTraceId);
  const taskId = assertSafeId(record.taskId, "taskId", validatedTraceId);
  const revision = assertPositiveInteger(
    record.revision,
    "revision",
    TASK_VERIFICATION_MAX_REVISION,
    validatedTraceId,
  );
  const updatedAt = assertIsoTimestamp(record.updatedAt, "updatedAt", validatedTraceId);
  const verificationType = assertEnum(
    record.verificationType,
    VERIFICATION_TYPES,
    "verificationType",
    validatedTraceId,
  );
  const points = assertPositiveInteger(record.points, "points", MAX_TASK_POINTS, validatedTraceId);
  const required = assertBoolean(record.required, "required", validatedTraceId);
  const walletPolicy = assertEnum(
    record.walletPolicy,
    WALLET_POLICIES,
    "walletPolicy",
    validatedTraceId,
  );
  const canonicalRule = canonicalizeTaskVerificationRule(record.evidenceRule, {
    traceId: validatedTraceId,
  });
  const taskRevisionPayload = serializeCanonicalRecord({
    campaignId,
    evidenceRuleDigest: canonicalRule.digest,
    points,
    required,
    revision,
    taskId,
    updatedAt,
    verificationType,
    walletPolicy,
  });

  return Object.freeze({
    campaignId,
    evidenceRule: canonicalRule.value,
    evidenceRuleDigest: canonicalRule.digest,
    points,
    required,
    revision,
    taskId,
    taskRevisionDigest: versionedSha256(
      "campaign-os/task-verification-revision/v1",
      taskRevisionPayload,
    ),
    updatedAt,
    verificationType,
    walletPolicy,
  });
};

export const deriveTaskVerificationIdentity = (
  input: unknown,
  untrustedClientClaims?: unknown,
): TaskVerificationIdentity => {
  void untrustedClientClaims;
  const traceId = traceIdFromUnknown(input);
  const record = assertExactRecord(
    input,
    ["binding", "issuedSubject", "task", "traceId"],
    "input",
    traceId,
  );
  const validatedTraceId = assertTraceId(record.traceId, "traceId", traceId);
  const task = assertCanonicalTask(record.task, validatedTraceId);
  const subjectRecord = assertExactRecord(
    record.issuedSubject,
    ["accountType", "sessionRef", "walletAddress", "walletSource"],
    "issuedSubject",
    validatedTraceId,
  );
  const walletAddress = assertWalletAddress(
    subjectRecord.walletAddress,
    "issuedSubject.walletAddress",
    validatedTraceId,
  );
  const accountType = assertEnum(
    subjectRecord.accountType,
    ACCOUNT_TYPES,
    "issuedSubject.accountType",
    validatedTraceId,
  );
  const walletSource = assertEnum(
    subjectRecord.walletSource,
    WALLET_SOURCES,
    "issuedSubject.walletSource",
    validatedTraceId,
  );
  const sessionRef = assertSafeId(
    subjectRecord.sessionRef,
    "issuedSubject.sessionRef",
    validatedTraceId,
  );
  const bindingRecord = assertExactRecord(
    record.binding,
    ["bindingId", "bindingRevision"],
    "binding",
    validatedTraceId,
  );
  const bindingId = assertSafeId(bindingRecord.bindingId, "binding.bindingId", validatedTraceId);
  const bindingRevision = assertPositiveInteger(
    bindingRecord.bindingRevision,
    "binding.bindingRevision",
    TASK_VERIFICATION_MAX_REVISION,
    validatedTraceId,
  );
  const idempotencyPayload = serializeCanonicalRecord({
    accountType,
    bindingId,
    bindingRevision,
    campaignId: task.campaignId,
    evidenceRuleDigest: task.evidenceRuleDigest,
    taskId: task.taskId,
    taskRevision: task.revision,
    taskRevisionDigest: task.taskRevisionDigest,
    walletAddress,
    walletSource,
  });

  return Object.freeze({
    binding: Object.freeze({ bindingId, bindingRevision }),
    campaignId: task.campaignId,
    evidenceRuleDigest: task.evidenceRuleDigest,
    externalDispatchLimit: TASK_VERIFICATION_EXTERNAL_DISPATCH_LIMIT,
    idempotencyKey: versionedSha256(
      "campaign-os/task-verification-idempotency/v1",
      idempotencyPayload,
    ),
    issuedSubject: Object.freeze({ accountType, sessionRef, walletAddress, walletSource }),
    taskId: task.taskId,
    taskRevision: task.revision,
    taskRevisionDigest: task.taskRevisionDigest,
  });
};

export const transitionTaskVerificationAttempt = (
  input: unknown,
): TaskVerificationTransition => {
  const traceId = traceIdFromUnknown(input);
  const record = assertKnownRecord(input, [
    "bindingEnabled",
    "currentStatus",
    "diagnosticCodes",
    "evidence",
    "positiveMatch",
    "targetStatus",
    "traceId",
    "transportExecuted",
  ], "input", traceId);
  const validatedTraceId = assertTraceId(record.traceId, "traceId", traceId);
  const currentStatus = assertAttemptStatus(record.currentStatus, "currentStatus", validatedTraceId);
  const targetStatus = assertAttemptStatus(record.targetStatus, "targetStatus", validatedTraceId);

  if (!ATTEMPT_TRANSITIONS[currentStatus].has(targetStatus)) {
    return fail("TASK_VERIFICATION_INVALID_TRANSITION", {
      field: "targetStatus",
      traceId: validatedTraceId,
    });
  }

  const bindingEnabled = assertBoolean(record.bindingEnabled, "bindingEnabled", validatedTraceId);
  const positiveMatch = assertBoolean(record.positiveMatch, "positiveMatch", validatedTraceId);
  const transportExecuted = assertBoolean(
    record.transportExecuted,
    "transportExecuted",
    validatedTraceId,
  );
  const diagnosticCodes = canonicalizeDiagnosticCodes(
    record.diagnosticCodes,
    "diagnosticCodes",
    validatedTraceId,
  );
  let evidence: TaskVerificationSafeEvidence | undefined;

  if (targetStatus === "completed") {
    if (!bindingEnabled || !positiveMatch || !transportExecuted || record.evidence === undefined) {
      return fail("TASK_VERIFICATION_INVALID_COMPLETED_OUTCOME", {
        field: "targetStatus",
        traceId: validatedTraceId,
      });
    }

    evidence = canonicalizeSafeEvidence(record.evidence, validatedTraceId);
    if (
      evidence.traceId !== validatedTraceId
      || !sameStrings(evidence.diagnosticCodes, diagnosticCodes)
    ) {
      return fail("TASK_VERIFICATION_INVALID_COMPLETED_OUTCOME", {
        field: "evidence",
        traceId: validatedTraceId,
      });
    }
  } else if (record.evidence !== undefined) {
    return fail("TASK_VERIFICATION_INVALID_OUTCOME", {
      field: "evidence",
      traceId: validatedTraceId,
    });
  }

  return Object.freeze({
    bindingEnabled,
    diagnosticCodes,
    evidence,
    positiveMatch,
    previousStatus: currentStatus,
    status: targetStatus,
    terminal: isTaskVerificationTerminalStatus(targetStatus),
    traceId: validatedTraceId,
    transportExecuted,
  });
};

export const resolveTaskVerificationExecutionPosture = (
  verificationType: unknown,
): TaskVerificationExecutionResolution => {
  if (!isEnumValue(verificationType, VERIFICATION_TYPES)) {
    return fail("TASK_VERIFICATION_INVALID_INPUT", {
      field: "verificationType",
      traceId: "trace-unavailable",
    });
  }

  return EXECUTION_POSTURES[verificationType];
};

export const isTaskVerificationAttemptStatus = (
  value: unknown,
): value is TaskVerificationAttemptStatus => isEnumValue(value, taskVerificationAttemptStatuses);

export const isTaskVerificationOutcomeStatus = (
  value: unknown,
): value is TaskVerificationOutcomeStatus => isEnumValue(value, taskVerificationOutcomeStatuses);

export const isTaskVerificationTerminalStatus = (
  value: unknown,
): value is TaskVerificationTerminalStatus => isEnumValue(value, taskVerificationTerminalStatuses);

export const assertNeverTaskVerification = (value: never): never => {
  void value;
  return fail("TASK_VERIFICATION_INVALID_INPUT", {
    field: "exhaustiveState",
    traceId: "trace-unavailable",
  });
};

function frozenExecutionResolution(
  posture: TaskVerificationExecutionPosture,
  bindingRequired: boolean,
  transportAllowed: boolean,
  defaultOutcome?: "manual_review",
): TaskVerificationExecutionResolution {
  return Object.freeze({ bindingRequired, defaultOutcome, posture, transportAllowed });
}

function canonicalizeSafeEvidence(
  value: unknown,
  traceId: string,
): TaskVerificationSafeEvidence {
  const record = assertExactRecord(value, [
    "diagnosticCodes",
    "evidenceHash",
    "evidenceRef",
    "evidenceSource",
    "traceId",
  ], "evidence", traceId);
  const evidenceTraceId = assertTraceId(record.traceId, "evidence.traceId", traceId);
  const evidenceHash = assertSha256(record.evidenceHash, "evidence.evidenceHash", traceId);
  const evidenceRef = assertEvidenceRef(record.evidenceRef, "evidence.evidenceRef", traceId);
  const evidenceSource = assertEnum(
    record.evidenceSource,
    ["AEFINDER", "AELFSCAN", "DAPP_API"] as const,
    "evidence.evidenceSource",
    traceId,
  );
  const diagnosticCodes = canonicalizeDiagnosticCodes(
    record.diagnosticCodes,
    "evidence.diagnosticCodes",
    traceId,
  );

  return Object.freeze({
    diagnosticCodes,
    evidenceHash,
    evidenceRef,
    evidenceSource,
    traceId: evidenceTraceId,
  });
}

function assertCanonicalTask(value: unknown, traceId: string): CanonicalTaskVerificationRevision {
  const record = assertExactRecord(value, [
    "campaignId",
    "evidenceRule",
    "evidenceRuleDigest",
    "points",
    "required",
    "revision",
    "taskId",
    "taskRevisionDigest",
    "updatedAt",
    "verificationType",
    "walletPolicy",
  ], "task", traceId);
  const canonical = createCanonicalTaskVerificationRevision({
    campaignId: record.campaignId,
    evidenceRule: record.evidenceRule,
    points: record.points,
    required: record.required,
    revision: record.revision,
    taskId: record.taskId,
    traceId,
    updatedAt: record.updatedAt,
    verificationType: record.verificationType,
    walletPolicy: record.walletPolicy,
  });

  if (
    record.evidenceRuleDigest !== canonical.evidenceRuleDigest
    || record.taskRevisionDigest !== canonical.taskRevisionDigest
  ) {
    return fail("TASK_VERIFICATION_INVALID_IDENTITY", { field: "task", traceId });
  }

  return canonical;
}

function canonicalizeRuleValue(
  value: unknown,
  field: string,
  traceId: string,
): TaskVerificationRuleValue {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return fail("TASK_VERIFICATION_UNSAFE_RULE", { field, traceId });
    }
    if (value.length > MAX_RULE_ARRAY_ITEMS) {
      return fail("TASK_VERIFICATION_BOUND_EXCEEDED", { field, traceId });
    }
    const canonicalItems = value.map((item, index) =>
      canonicalizeRulePrimitive(item, `${field}.${index}`, traceId));
    const unique = [...new Map(
      canonicalItems.map((item) => [serializeCanonicalPrimitive(item), item]),
    ).entries()]
      .sort(([left], [right]) => compareCanonicalStrings(left, right))
      .map(([, item]) => item);
    return Object.freeze(unique);
  }

  return canonicalizeRulePrimitive(value, field, traceId);
}

function canonicalizeRulePrimitive(
  value: unknown,
  field: string,
  traceId: string,
): TaskVerificationRulePrimitive {
  if (typeof value === "string") {
    if (CONTROL_CHARACTER_PATTERN.test(value) || UNSAFE_RULE_VALUE_PATTERN.test(value)) {
      return fail("TASK_VERIFICATION_UNSAFE_RULE", { field, traceId });
    }
    const canonical = value.trim().replace(/ {2,}/g, " ");
    if (canonical.length === 0) {
      return fail("TASK_VERIFICATION_UNSAFE_RULE", { field, traceId });
    }
    if (canonical.length > MAX_RULE_STRING_LENGTH) {
      return fail("TASK_VERIFICATION_BOUND_EXCEEDED", { field, traceId });
    }
    if (!hasValidUnicode(canonical)) {
      return fail("TASK_VERIFICATION_UNSAFE_RULE", { field, traceId });
    }
    return canonical;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || Math.abs(value) > MAX_SAFE_RULE_NUMBER) {
      return fail("TASK_VERIFICATION_UNSAFE_RULE", { field, traceId });
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return fail("TASK_VERIFICATION_UNSAFE_RULE", { field, traceId });
}

function assertRuleKey(value: string, traceId: string): void {
  if (
    value.length === 0
    || value.length > MAX_RULE_KEY_LENGTH
    || !SAFE_RULE_KEY_PATTERN.test(value)
    || UNSAFE_RULE_KEY_PATTERN.test(value)
  ) {
    return fail(
      value.length > MAX_RULE_KEY_LENGTH
        ? "TASK_VERIFICATION_BOUND_EXCEEDED"
        : "TASK_VERIFICATION_UNSAFE_RULE",
      { field: "evidenceRule", traceId },
    );
  }
}

function canonicalizeDiagnosticCodes(
  value: unknown,
  field: string,
  traceId: string,
): readonly string[] {
  if (!Array.isArray(value)) {
    return fail("TASK_VERIFICATION_INVALID_INPUT", { field, traceId });
  }
  if (value.length > MAX_DIAGNOSTIC_CODES) {
    return fail("TASK_VERIFICATION_BOUND_EXCEEDED", { field, traceId });
  }

  const codes = value.map((code, index) => {
    if (typeof code !== "string" || code.length === 0 || !SAFE_DIAGNOSTIC_PATTERN.test(code)) {
      return fail("TASK_VERIFICATION_INVALID_INPUT", { field: `${field}.${index}`, traceId });
    }
    if (code.length > TASK_VERIFICATION_MAX_DIAGNOSTIC_CODE_LENGTH) {
      return fail("TASK_VERIFICATION_BOUND_EXCEEDED", { field: `${field}.${index}`, traceId });
    }
    return code;
  });

  return Object.freeze([...new Set(codes)].sort());
}

function assertSha256(value: unknown, field: string, traceId: string): string {
  if (typeof value !== "string" || !SHA_256_PATTERN.test(value)) {
    return fail("TASK_VERIFICATION_INVALID_COMPLETED_OUTCOME", { field, traceId });
  }
  return value;
}

function assertEvidenceRef(value: unknown, field: string, traceId: string): string {
  if (typeof value !== "string" || value.length === 0) {
    return fail("TASK_VERIFICATION_INVALID_COMPLETED_OUTCOME", { field, traceId });
  }
  if (value.length > TASK_VERIFICATION_MAX_EVIDENCE_REF_LENGTH) {
    return fail("TASK_VERIFICATION_BOUND_EXCEEDED", { field, traceId });
  }
  if (
    CONTROL_CHARACTER_PATTERN.test(value)
    || UNSAFE_RULE_VALUE_PATTERN.test(value)
    || UNSAFE_EVIDENCE_REF_SEGMENT_PATTERN.test(value)
    || !SAFE_EVIDENCE_REF_PATTERN.test(value)
    || value !== value.trim()
    || value.startsWith("/")
    || value.includes("..")
  ) {
    return fail("TASK_VERIFICATION_INVALID_COMPLETED_OUTCOME", { field, traceId });
  }
  return value;
}

function assertAttemptStatus(
  value: unknown,
  field: string,
  traceId: string,
): TaskVerificationAttemptStatus {
  if (!isTaskVerificationAttemptStatus(value)) {
    return fail("TASK_VERIFICATION_INVALID_INPUT", { field, traceId });
  }
  return value;
}

function assertPositiveInteger(
  value: unknown,
  field: string,
  maximum: number,
  traceId: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return fail("TASK_VERIFICATION_INVALID_INPUT", { field, traceId });
  }
  if (value > maximum) {
    return fail("TASK_VERIFICATION_BOUND_EXCEEDED", { field, traceId });
  }
  return value;
}

function assertBoolean(value: unknown, field: string, traceId: string): boolean {
  if (typeof value !== "boolean") {
    return fail("TASK_VERIFICATION_INVALID_INPUT", { field, traceId });
  }
  return value;
}

function assertSafeId(value: unknown, field: string, traceId: string): string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > MAX_SAFE_ID_LENGTH
    || !SAFE_ID_PATTERN.test(value)
  ) {
    return fail(
      typeof value === "string" && value.length > MAX_SAFE_ID_LENGTH
        ? "TASK_VERIFICATION_BOUND_EXCEEDED"
        : "TASK_VERIFICATION_INVALID_INPUT",
      { field, traceId },
    );
  }
  return value;
}

function assertWalletAddress(value: unknown, field: string, traceId: string): string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > MAX_WALLET_ADDRESS_LENGTH
    || !SAFE_WALLET_PATTERN.test(value)
  ) {
    return fail(
      typeof value === "string" && value.length > MAX_WALLET_ADDRESS_LENGTH
        ? "TASK_VERIFICATION_BOUND_EXCEEDED"
        : "TASK_VERIFICATION_INVALID_IDENTITY",
      { field, traceId },
    );
  }
  return value;
}

function assertTraceId(value: unknown, field: string, fallbackTraceId: string): string {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > TASK_VERIFICATION_MAX_TRACE_ID_LENGTH
    || !SAFE_ID_PATTERN.test(value)
  ) {
    return fail(
      typeof value === "string" && value.length > TASK_VERIFICATION_MAX_TRACE_ID_LENGTH
        ? "TASK_VERIFICATION_BOUND_EXCEEDED"
        : "TASK_VERIFICATION_INVALID_INPUT",
      { field, traceId: fallbackTraceId },
    );
  }
  return value;
}

function assertIsoTimestamp(value: unknown, field: string, traceId: string): string {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return fail("TASK_VERIFICATION_INVALID_INPUT", { field, traceId });
  }
  try {
    if (new Date(value).toISOString() !== value) {
      return fail("TASK_VERIFICATION_INVALID_INPUT", { field, traceId });
    }
  } catch {
    return fail("TASK_VERIFICATION_INVALID_INPUT", { field, traceId });
  }
  return value;
}

function assertEnum<const T extends readonly string[]>(
  value: unknown,
  values: T,
  field: string,
  traceId: string,
): T[number] {
  if (!isEnumValue(value, values)) {
    return fail("TASK_VERIFICATION_INVALID_INPUT", { field, traceId });
  }
  return value;
}

function isEnumValue<const T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function assertExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
  field: string,
  traceId: string,
): Record<string, unknown> {
  const record = assertPlainRecord(value, field, traceId, "TASK_VERIFICATION_INVALID_INPUT");
  const actualKeys = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  if (
    actualKeys.length !== expected.length
    || actualKeys.some((key, index) => key !== expected[index])
  ) {
    return fail("TASK_VERIFICATION_INVALID_INPUT", { field, traceId });
  }
  return record;
}

function assertKnownRecord(
  value: unknown,
  knownKeys: readonly string[],
  field: string,
  traceId: string,
): Record<string, unknown> {
  const record = assertPlainRecord(value, field, traceId, "TASK_VERIFICATION_INVALID_INPUT");
  const known = new Set(knownKeys);
  if (Object.keys(record).some((key) => !known.has(key))) {
    return fail("TASK_VERIFICATION_INVALID_INPUT", { field, traceId });
  }
  for (const required of knownKeys.filter((key) => key !== "evidence")) {
    if (!Object.prototype.hasOwnProperty.call(record, required)) {
      return fail("TASK_VERIFICATION_INVALID_INPUT", { field: required, traceId });
    }
  }
  return record;
}

function assertPlainRecord(
  value: unknown,
  field: string,
  traceId: string,
  code: TaskVerificationDomainErrorCode,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(code, { field, traceId });
  }
  let prototype: object | null;
  let ownKeys: readonly PropertyKey[];

  try {
    prototype = Object.getPrototypeOf(value);
    ownKeys = Reflect.ownKeys(value);
  } catch {
    return fail(code, { field, traceId });
  }

  if (prototype !== Object.prototype && prototype !== null) {
    return fail(code, { field, traceId });
  }

  for (const key of ownKeys) {
    let descriptor: PropertyDescriptor | undefined;

    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      return fail(code, { field, traceId });
    }

    if (
      typeof key !== "string"
      || !descriptor?.enumerable
      || !("value" in descriptor)
    ) {
      return fail(code, { field, traceId });
    }
  }

  return value as Record<string, unknown>;
}

function serializeCanonicalRecord(
  record: Readonly<Record<string, TaskVerificationRuleValue>>,
): string {
  const fields = Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${serializeCanonicalValue(record[key])}`);
  return `{${fields.join(",")}}`;
}

function serializeCanonicalValue(value: TaskVerificationRuleValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(serializeCanonicalPrimitive).join(",")}]`;
  }
  return serializeCanonicalPrimitive(value as TaskVerificationRulePrimitive);
}

function serializeCanonicalPrimitive(value: TaskVerificationRulePrimitive): string {
  if (typeof value === "number") {
    return Object.is(value, -0) ? "0" : String(value);
  }
  return JSON.stringify(value);
}

function versionedSha256(namespace: string, payload: string): string {
  const header = `${namespace}\n${Buffer.byteLength(payload, "utf8")}\n`;
  return createHash("sha256")
    .update(header, "utf8")
    .update(payload, "utf8")
    .digest("hex");
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareCanonicalStrings(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function traceIdFromUnknown(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "trace-unavailable";
  }

  let descriptor: PropertyDescriptor | undefined;

  try {
    descriptor = Object.getOwnPropertyDescriptor(value, "traceId");
  } catch {
    return "trace-unavailable";
  }

  const traceId = descriptor && "value" in descriptor
    ? descriptor.value
    : undefined;
  return typeof traceId === "string"
    ? safeContextValue(traceId, "trace-unavailable", TASK_VERIFICATION_MAX_TRACE_ID_LENGTH)
    : "trace-unavailable";
}

function safeContextValue(value: string, fallback: string, maximum: number): string {
  return value.length > 0 && value.length <= maximum && SAFE_ID_PATTERN.test(value)
    ? value
    : fallback;
}

function hasValidUnicode(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        return false;
      }
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}
