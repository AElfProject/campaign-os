import { createHash } from "node:crypto";
import {
  isServerIssuedTaskVerificationIdentity,
  type CanonicalTaskVerificationRevision,
  type TaskVerificationIdentity,
  type TaskVerificationRulePrimitive,
} from "./taskVerification";
import type {
  TaskVerificationBinding,
  TaskVerificationEnvironment,
} from "./taskVerificationConfig";
import type {
  ProviderHttpAttemptMetadata,
  ProviderHttpVerificationRequestInput,
} from "./providerHttpRequestPlanner";
import type {
  ProviderHttpResponseMatchInput,
  ProviderHttpResponseMatchResult,
  ProviderHttpResponseMatcher,
} from "./providerHttpResponseNormalizer";
import {
  createProviderHttpCanonicalRequestMaterial,
  normalizeProviderHttpCanonicalRequestMapping,
  type ProviderHttpCanonicalRequestFieldMapping,
  type ProviderHttpCanonicalRequestMapping,
  type ProviderHttpCanonicalRequestMaterial,
  type ProviderHttpCanonicalRequestPrimitive,
} from "./providerHttpExecutionMaterial";
import { providerHttpEndpointRegistry } from "./providerHttpRuntimeRegistry";
import type {
  ProviderHttpMethod,
  ProviderHttpProviderFamily,
  ProviderHttpVerificationType,
} from "./providerHttpRuntimeTypes";

export const taskVerificationProviderStrategyIds = Object.freeze([
  "on-chain-indexer-v1",
  "dapp-api-status-v1",
  "sandbox-verification-v1",
] as const);

export type TaskVerificationProviderStrategyId =
  (typeof taskVerificationProviderStrategyIds)[number];

export type TaskVerificationProviderStrategyDiagnosticCode =
  | "TASK_VERIFICATION_STRATEGY_AUTHORITY_INVALID"
  | "TASK_VERIFICATION_STRATEGY_BINDING_UNSUPPORTED"
  | "TASK_VERIFICATION_STRATEGY_DUPLICATE"
  | "TASK_VERIFICATION_STRATEGY_EXPECTATION_INVALID"
  | "TASK_VERIFICATION_STRATEGY_POSTURE_BLOCKED"
  | "TASK_VERIFICATION_STRATEGY_RESULT_INVALID"
  | "TASK_VERIFICATION_STRATEGY_RULE_UNSUPPORTED"
  | "TASK_VERIFICATION_STRATEGY_UNKNOWN";

const STRATEGY_MESSAGES: Readonly<
  Record<TaskVerificationProviderStrategyDiagnosticCode, string>
> = Object.freeze({
  TASK_VERIFICATION_STRATEGY_AUTHORITY_INVALID:
    "Task verification strategy authority is invalid.",
  TASK_VERIFICATION_STRATEGY_BINDING_UNSUPPORTED:
    "Task verification provider binding is unsupported.",
  TASK_VERIFICATION_STRATEGY_DUPLICATE:
    "Task verification provider strategy registration is duplicated.",
  TASK_VERIFICATION_STRATEGY_EXPECTATION_INVALID:
    "Task verification provider expectation is invalid.",
  TASK_VERIFICATION_STRATEGY_POSTURE_BLOCKED:
    "Task verification provider strategy is blocked in this environment.",
  TASK_VERIFICATION_STRATEGY_RESULT_INVALID:
    "Task verification provider result is invalid.",
  TASK_VERIFICATION_STRATEGY_RULE_UNSUPPORTED:
    "Task verification provider rule contains an unsupported field.",
  TASK_VERIFICATION_STRATEGY_UNKNOWN:
    "Task verification provider strategy is unknown.",
});

export class TaskVerificationProviderStrategyRegistryError extends Error {
  readonly code: TaskVerificationProviderStrategyDiagnosticCode;

  constructor(code: TaskVerificationProviderStrategyDiagnosticCode) {
    super(STRATEGY_MESSAGES[code]);
    this.name = "TaskVerificationProviderStrategyRegistryError";
    this.code = code;
    delete this.stack;
  }
}

export interface TaskVerificationProviderBindingStrategy {
  readonly allowedRuleFields: readonly string[];
  readonly endpointId?: string;
  readonly providerFamily: ProviderHttpProviderFamily | "sandbox";
  readonly providerGroupId?: string;
  readonly requestMapping: ProviderHttpCanonicalRequestMapping;
  readonly requestMappingId: string;
  readonly responseFieldAliases: Readonly<Record<string, string>>;
  readonly responseMappingId: string;
  readonly strategyId: TaskVerificationProviderStrategyId;
  readonly verificationType: Extract<ProviderHttpVerificationType, "ON_CHAIN" | "DAPP_API">;
}

export interface TaskVerificationProviderProtocolStrategy {
  readonly id: TaskVerificationProviderStrategyId;
}

export interface TaskVerificationProviderRequestBuildInput {
  readonly attempt: ProviderHttpAttemptMetadata;
  readonly binding: TaskVerificationBinding;
  readonly identity: TaskVerificationIdentity;
  readonly task: CanonicalTaskVerificationRevision;
  readonly traceId: string;
}

export interface TaskVerificationProviderMatcherContext {
  readonly bindingId: string;
  readonly expectedField: string;
  readonly expectedType: "boolean" | "number" | "string";
  readonly expectedValueDigest: string;
  readonly matcherContextDigest: string;
  readonly responseMappingId: string;
  readonly strategyId: TaskVerificationProviderStrategyId;
  readonly traceId: string;
}

export interface TaskVerificationProviderRequestBuild {
  readonly matcher: ProviderHttpResponseMatcher;
  readonly matcherContext: TaskVerificationProviderMatcherContext;
  readonly plannerInput: ProviderHttpVerificationRequestInput;
  readonly requestMaterial: ProviderHttpCanonicalRequestMaterial;
  readonly strategyId: TaskVerificationProviderStrategyId;
}

export type TaskVerificationProviderRequestBuildResult =
  | Readonly<{
    diagnosticCode: TaskVerificationProviderStrategyDiagnosticCode;
    ok: false;
  }>
  | Readonly<TaskVerificationProviderRequestBuild & { ok: true }>;

export type TaskVerificationProviderStrategyResolution =
  | Readonly<{
    diagnosticCode: TaskVerificationProviderStrategyDiagnosticCode;
    ok: false;
  }>
  | Readonly<{
    definition?: TaskVerificationProviderBindingStrategy;
    ok: true;
    strategyId: TaskVerificationProviderStrategyId;
  }>;

export interface TaskVerificationProviderStrategyRegistry {
  readonly bindingStrategies: readonly TaskVerificationProviderBindingStrategy[];
  readonly buildRequest: (
    input: TaskVerificationProviderRequestBuildInput,
  ) => TaskVerificationProviderRequestBuildResult;
  readonly environment: TaskVerificationEnvironment;
  readonly resolveBinding: (
    binding: TaskVerificationBinding,
  ) => TaskVerificationProviderStrategyResolution;
  readonly resolveById: (
    strategyId: string,
  ) => TaskVerificationProviderStrategyResolution;
  readonly strategies: readonly TaskVerificationProviderProtocolStrategy[];
  readonly supportedRequestMappingIds: ReadonlySet<string>;
  readonly supportedResponseMappingIds: ReadonlySet<string>;
}

export interface CreateTaskVerificationProviderStrategyRegistryOptions {
  readonly bindingStrategies?: readonly TaskVerificationProviderBindingStrategy[];
  readonly environment?: TaskVerificationEnvironment;
  readonly protocolStrategies?: readonly TaskVerificationProviderProtocolStrategy[];
  readonly strategies?: readonly TaskVerificationProviderProtocolStrategy[];
}

const ON_CHAIN_ALLOWED_RULE_FIELDS = Object.freeze([
  "chainId",
  "contractAddress",
  "eventName",
  "expectedField",
  "expectedType",
  "expectedValue",
  "methodName",
  "minimum",
  "negativeValue",
  "pendingValue",
] as const);

const DAPP_ALLOWED_RULE_FIELDS = Object.freeze([
  "action",
  "asset",
  "campaign",
  "expectedField",
  "expectedType",
  "expectedValue",
  "minimum",
  "negativeValue",
  "pendingValue",
  "target",
  "value",
] as const);

const ON_CHAIN_REQUEST_RULE_FIELDS = Object.freeze([
  "contractAddress",
  "eventName",
  "methodName",
  "minimum",
] as const);

const DAPP_REQUEST_RULE_FIELDS = Object.freeze([
  "action",
  "asset",
  "campaign",
  "minimum",
  "target",
  "value",
] as const);

const RESPONSE_FIELD_ALIASES = Object.freeze({
  amount: "amount",
  completed: "completed",
  count: "count",
  eligible: "eligible",
  result: "result",
  status: "status",
  verified: "verified",
});

const strategyIdByVerificationType = new Map<
  Extract<ProviderHttpVerificationType, "ON_CHAIN" | "DAPP_API">,
  TaskVerificationProviderStrategyId
>([
  ["ON_CHAIN", "on-chain-indexer-v1"],
  ["DAPP_API", "dapp-api-status-v1"],
]);

const allowedRuleFieldsByStrategy = new Map<
  TaskVerificationProviderStrategyId,
  readonly string[]
>([
  ["on-chain-indexer-v1", ON_CHAIN_ALLOWED_RULE_FIELDS],
  ["dapp-api-status-v1", DAPP_ALLOWED_RULE_FIELDS],
  ["sandbox-verification-v1", DAPP_ALLOWED_RULE_FIELDS],
]);

function createDefaultRequestMapping(
  strategyId: TaskVerificationProviderStrategyId,
  method: ProviderHttpMethod,
): ProviderHttpCanonicalRequestMapping {
  const dataTarget = method === "POST" ? "body" : "query";
  const fields: ProviderHttpCanonicalRequestFieldMapping[] = [
    {
      name: "participantWallet",
      required: true,
      source: "participant.walletAddress",
      target: "path",
    },
    {
      name: "taskId",
      required: true,
      source: "task.taskId",
      target: "path",
    },
    {
      name: "x-campaign-id",
      required: true,
      source: "task.campaignId",
      target: "header",
    },
    {
      name: "x-wallet-source",
      required: true,
      source: "participant.walletSource",
      target: "header",
    },
    {
      name: "taskRevision",
      required: true,
      source: "task.revision",
      target: dataTarget,
    },
  ];

  if (strategyId === "on-chain-indexer-v1") {
    fields.push({
      name: "chainId",
      required: true,
      source: "rule.chainId",
      target: "query",
    });
    fields.push(...ON_CHAIN_REQUEST_RULE_FIELDS.map((field) => ({
      name: field,
      source: `rule.${field}`,
      target: dataTarget,
    } as const)));
  } else {
    fields.push(...DAPP_REQUEST_RULE_FIELDS.map((field) => ({
      name: field,
      source: `rule.${field}`,
      target: dataTarget,
    } as const)));
  }

  return normalizeProviderHttpCanonicalRequestMapping({
    fields,
    method,
    pathTemplate: "/participants/{participantWallet}/tasks/{taskId}",
  });
}

export const defaultTaskVerificationProviderBindingStrategies:
readonly TaskVerificationProviderBindingStrategy[] = Object.freeze(
  providerHttpEndpointRegistry.flatMap((endpoint) => {
    if (endpoint.rolloutStatus !== "enabled") {
      return [];
    }

    const verificationType = endpoint.supportedVerificationTypes.find(
      (value): value is "ON_CHAIN" | "DAPP_API" =>
        value === "ON_CHAIN" || value === "DAPP_API",
    );
    const strategyId = verificationType
      ? strategyIdByVerificationType.get(verificationType)
      : undefined;

    if (!verificationType || !strategyId) {
      return [];
    }

    return [freezeBindingStrategy({
      allowedRuleFields: allowedRuleFieldsByStrategy.get(strategyId) ?? [],
      endpointId: endpoint.endpointId,
      providerFamily: endpoint.providerFamily,
      providerGroupId: endpoint.providerGroupId,
      requestMapping: createDefaultRequestMapping(strategyId, endpoint.method),
      requestMappingId: endpoint.requestMappingId,
      responseFieldAliases: RESPONSE_FIELD_ALIASES,
      responseMappingId: endpoint.responseMappingId,
      strategyId,
      verificationType,
    })];
  }),
);

export const defaultTaskVerificationProviderProtocolStrategies:
readonly TaskVerificationProviderProtocolStrategy[] = Object.freeze(
  taskVerificationProviderStrategyIds.map((id) => Object.freeze({ id })),
);

export const createTaskVerificationProviderStrategyRegistry = (
  options: CreateTaskVerificationProviderStrategyRegistryOptions = {},
): TaskVerificationProviderStrategyRegistry => {
  const environment = options.environment ?? "production";
  const definitions = Object.freeze(
    (options.bindingStrategies ?? defaultTaskVerificationProviderBindingStrategies)
      .map(validateAndFreezeBindingStrategy),
  );
  assertNoDuplicateDefinitions(definitions);
  const strategies = Object.freeze(
    (options.protocolStrategies
      ?? options.strategies
      ?? defaultTaskVerificationProviderProtocolStrategies)
      .map(validateAndFreezeProtocolStrategy),
  );
  assertNoDuplicateProtocolStrategies(strategies);
  const registeredStrategyIds = createReadonlySet(strategies.map(({ id }) => id));
  if (definitions.some(({ strategyId }) => !registeredStrategyIds.has(strategyId))) {
    throw new TaskVerificationProviderStrategyRegistryError(
      "TASK_VERIFICATION_STRATEGY_UNKNOWN",
    );
  }

  const supportedRequestMappingIds = createReadonlySet(
    definitions.map(({ requestMappingId }) => requestMappingId),
  );
  const supportedResponseMappingIds = createReadonlySet(
    definitions.map(({ responseMappingId }) => responseMappingId),
  );

  const resolveById = (
    strategyId: string,
  ): TaskVerificationProviderStrategyResolution => {
    if (!isStrategyId(strategyId) || !registeredStrategyIds.has(strategyId)) {
      return failedResolution("TASK_VERIFICATION_STRATEGY_UNKNOWN");
    }

    if (strategyId === "sandbox-verification-v1" && environment === "production") {
      return failedResolution("TASK_VERIFICATION_STRATEGY_POSTURE_BLOCKED");
    }

    return Object.freeze({ ok: true as const, strategyId });
  };

  const resolveBinding = (
    binding: TaskVerificationBinding,
  ): TaskVerificationProviderStrategyResolution => {
    const definition = definitions.find((candidate) => definitionMatchesBinding(candidate, binding));

    if (!definition) {
      return failedResolution("TASK_VERIFICATION_STRATEGY_BINDING_UNSUPPORTED");
    }

    const strategyResolution = resolveById(definition.strategyId);
    return strategyResolution.ok
      ? Object.freeze({
        definition,
        ok: true as const,
        strategyId: definition.strategyId,
      })
      : strategyResolution;
  };

  const registry: TaskVerificationProviderStrategyRegistry = Object.freeze({
    bindingStrategies: definitions,
    buildRequest: (input: TaskVerificationProviderRequestBuildInput) =>
      buildProviderRequest(input, resolveBinding),
    environment,
    resolveBinding,
    resolveById,
    strategies,
    supportedRequestMappingIds,
    supportedResponseMappingIds,
  });

  return registry;
};

export const taskVerificationProviderStrategyRegistry =
  createTaskVerificationProviderStrategyRegistry();

export interface CanonicalProviderResultDigestInput {
  readonly diagnosticCodes: readonly string[];
  readonly evidenceHash?: string;
  readonly evidenceRef?: string;
  readonly outcome: "completed" | "failed" | "manual_review" | "pending";
  readonly positiveMatch: boolean;
  readonly strategyId: TaskVerificationProviderStrategyId;
  readonly traceId: string;
}

export const createCanonicalProviderResultDigest = (
  input: CanonicalProviderResultDigestInput,
): string => {
  const keys = Object.keys(input);
  const allowedKeys = new Set([
    "diagnosticCodes",
    "evidenceHash",
    "evidenceRef",
    "outcome",
    "positiveMatch",
    "strategyId",
    "traceId",
  ]);

  if (
    !isPlainRecord(input)
    || keys.some((key) => !allowedKeys.has(key))
    || !isStrategyId(input.strategyId)
    || !Array.isArray(input.diagnosticCodes)
  ) {
    throw new TaskVerificationProviderStrategyRegistryError(
      "TASK_VERIFICATION_STRATEGY_RESULT_INVALID",
    );
  }

  return versionedDigest(
    "campaign-os/task-verification-provider-result/v1",
    canonicalJson(input),
  );
};

function buildProviderRequest(
  input: TaskVerificationProviderRequestBuildInput,
  resolveBinding: TaskVerificationProviderStrategyRegistry["resolveBinding"],
): TaskVerificationProviderRequestBuildResult {
  if (!hasValidAuthority(input)) {
    return failedBuild("TASK_VERIFICATION_STRATEGY_AUTHORITY_INVALID");
  }

  const resolution = resolveBinding(input.binding);
  if (!resolution.ok || !resolution.definition) {
    return failedBuild(
      resolution.ok
        ? "TASK_VERIFICATION_STRATEGY_BINDING_UNSUPPORTED"
        : resolution.diagnosticCode,
    );
  }

  const rule = input.task.evidenceRule;
  const allowedRuleFields = new Set(resolution.definition.allowedRuleFields);
  if (
    Object.keys(rule).some((field) => !allowedRuleFields.has(field))
    || Object.values(rule).some((value) => !isBoundedRulePrimitive(value))
  ) {
    return failedBuild("TASK_VERIFICATION_STRATEGY_RULE_UNSUPPORTED");
  }

  const expected = resolveExpectation(rule, resolution.definition);
  if (!expected) {
    return failedBuild("TASK_VERIFICATION_STRATEGY_EXPECTATION_INVALID");
  }

  const requestValues = resolveCanonicalRequestValues(input, resolution.definition.requestMapping);
  if (!requestValues) {
    return failedBuild("TASK_VERIFICATION_STRATEGY_RULE_UNSUPPORTED");
  }

  let canonicalRequest: ReturnType<typeof createProviderHttpCanonicalRequestMaterial>;
  try {
    canonicalRequest = createProviderHttpCanonicalRequestMaterial({
      bindingId: input.binding.id,
      bindingRevision: input.binding.revision,
      endpointId: input.binding.endpointId,
      mapping: resolution.definition.requestMapping,
      requestMappingId: resolution.definition.requestMappingId,
      strategyId: resolution.strategyId,
      values: requestValues,
    });
  } catch {
    return failedBuild("TASK_VERIFICATION_STRATEGY_RULE_UNSUPPORTED");
  }

  const matcherContextDigest = versionedDigest(
    "campaign-os/task-verification-provider-matcher/v1",
    canonicalJson({
      bindingId: input.binding.id,
      evidenceRuleDigest: input.task.evidenceRuleDigest,
      expectedField: expected.responseField,
      expectedType: expected.type,
      expectedValue: expected.value,
      responseMappingId: input.binding.responseMappingId,
      strategyId: resolution.strategyId,
      taskRevisionDigest: input.task.taskRevisionDigest,
    }),
  );
  const matcherContext = Object.freeze({
    bindingId: input.binding.id,
    expectedField: expected.responseField,
    expectedType: expected.type,
    expectedValueDigest: versionedDigest(
      "campaign-os/task-verification-provider-expected-value/v1",
      canonicalJson(expected.value),
    ),
    matcherContextDigest,
    responseMappingId: input.binding.responseMappingId,
    strategyId: resolution.strategyId,
    traceId: input.traceId,
  });
  const subjectDigest = versionedDigest(
    "campaign-os/task-verification-provider-subject/v1",
    canonicalJson({
      accountType: input.identity.issuedSubject.accountType,
      walletAddress: input.identity.issuedSubject.walletAddress,
      walletSource: input.identity.issuedSubject.walletSource,
    }),
  );
  const bodyRef = input.binding.bodyEnvKey
    ? configReference(input.binding.bodyEnvKey)
    : undefined;
  const plannerInput: ProviderHttpVerificationRequestInput = Object.freeze({
    attempt: Object.freeze({ ...input.attempt }),
    ...(bodyRef ? { bodyRef } : {}),
    campaignId: input.task.campaignId,
    endpointId: input.binding.endpointId,
    idempotencyRef: `idem-ref:${input.identity.idempotencyKey}`,
    leaseRef: `lease-ref:${versionedDigest(
      "campaign-os/task-verification-provider-lease/v1",
      input.identity.idempotencyKey,
    )}`,
    matcherContextDigest,
    maxResponseBytes: input.binding.maxResponseBytes,
    operatorContextRefs: Object.freeze({
      evidenceRule: `evidence-ref:${input.task.evidenceRuleDigest}`,
      subject: `account-ref:${subjectDigest}`,
      taskRevision: `evidence-ref:${input.task.taskRevisionDigest}`,
    }),
    providerGroupId: input.binding.providerGroupId,
    requestMaterialRef: canonicalRequest.requestMaterialRef,
    strategyId: resolution.strategyId,
    taskId: input.task.taskId,
    timeoutMs: input.binding.timeoutMs,
    traceId: input.traceId,
    verificationType: input.binding.verificationType,
    walletAccountRef: `account-ref:${subjectDigest}`,
    walletSessionRef: `session-ref:${versionedDigest(
      "campaign-os/task-verification-provider-session/v1",
      input.identity.issuedSubject.sessionRef,
    )}`,
  });

  return Object.freeze({
    matcher: createMatcher(matcherContext, resolution.definition, expected.value),
    matcherContext,
    ok: true as const,
    plannerInput,
    requestMaterial: canonicalRequest.material,
    strategyId: resolution.strategyId,
  });
}

function createMatcher(
  context: TaskVerificationProviderMatcherContext,
  definition: TaskVerificationProviderBindingStrategy,
  expectedValue: TaskVerificationRulePrimitive,
): ProviderHttpResponseMatcher {
  const statusField = definition.responseFieldAliases.status ?? "status";
  const evidenceHashField = definition.responseFieldAliases.evidenceHash ?? "evidenceHash";
  const evidenceRefField = definition.responseFieldAliases.evidenceRef ?? "evidenceRef";

  return (input: ProviderHttpResponseMatchInput): ProviderHttpResponseMatchResult => {
    if (!input.transportExecuted) {
      return matchResult("manual_review", false, ["PROVIDER_MATCH_TRANSPORT_REQUIRED"]);
    }

    if (!isPlainRecord(input.body)) {
      return matchResult("manual_review", false, ["PROVIDER_MATCH_MALFORMED"]);
    }

    const status = input.body[statusField];
    if (typeof status === "string") {
      const normalizedStatus = status.toLowerCase();

      if (PENDING_STATUSES.has(normalizedStatus)) {
        return matchResult("pending", false, ["PROVIDER_MATCH_PENDING"]);
      }

      if (NEGATIVE_STATUSES.has(normalizedStatus)) {
        return matchResult("failed", false, ["PROVIDER_MATCH_NEGATIVE"]);
      }

      if (!POSITIVE_STATUSES.has(normalizedStatus)) {
        return matchResult("manual_review", false, ["PROVIDER_MATCH_UNKNOWN"]);
      }
    } else if (status === undefined) {
      return matchResult("manual_review", false, ["PROVIDER_MATCH_MISSING"]);
    } else {
      return matchResult("manual_review", false, ["PROVIDER_MATCH_MALFORMED"]);
    }

    const actual = input.body[context.expectedField];
    if (actual === undefined) {
      return matchResult("manual_review", false, ["PROVIDER_MATCH_MISSING"]);
    }

    if (typeof actual !== context.expectedType) {
      return matchResult("manual_review", false, ["PROVIDER_MATCH_TYPE_MISMATCH"]);
    }

    if (!Object.is(actual, expectedValue)) {
      return matchResult("failed", false, ["PROVIDER_MATCH_NEGATIVE"]);
    }

    const evidenceHash = input.body[evidenceHashField];
    const evidenceRef = input.body[evidenceRefField];
    if (!isSafeEvidenceHash(evidenceHash) || !isSafeEvidenceRef(evidenceRef)) {
      return matchResult("manual_review", false, ["PROVIDER_MATCH_EVIDENCE_INVALID"]);
    }

    return Object.freeze({
      diagnosticCodes: Object.freeze(["PROVIDER_MATCH_POSITIVE"]),
      evidenceHash,
      evidenceRef,
      outcome: "completed" as const,
      positiveMatch: true,
    });
  };
}

function resolveCanonicalRequestValues(
  input: TaskVerificationProviderRequestBuildInput,
  mapping: ProviderHttpCanonicalRequestMapping,
): Readonly<Record<string, ProviderHttpCanonicalRequestPrimitive>> | undefined {
  const values: Record<string, ProviderHttpCanonicalRequestPrimitive> = {};
  for (const field of mapping.fields) {
    if (values[field.source] !== undefined) {
      continue;
    }
    const value = canonicalRequestValue(input, field.source);
    if (value === undefined) {
      if (field.required) {
        return undefined;
      }
      continue;
    }
    if (!isBoundedRulePrimitive(value)) {
      return undefined;
    }
    values[field.source] = value;
  }
  return Object.freeze(values);
}

function canonicalRequestValue(
  input: TaskVerificationProviderRequestBuildInput,
  source: string,
): TaskVerificationRulePrimitive | undefined {
  if (source.startsWith("rule.")) {
    const value = input.task.evidenceRule[source.slice("rule.".length)];
    return isBoundedRulePrimitive(value) ? value : undefined;
  }

  const fixedValues: Readonly<Record<string, TaskVerificationRulePrimitive>> = {
    "participant.accountType": input.identity.issuedSubject.accountType,
    "participant.walletAddress": input.identity.issuedSubject.walletAddress,
    "participant.walletSource": input.identity.issuedSubject.walletSource,
    "task.campaignId": input.task.campaignId,
    "task.revision": input.task.revision,
    "task.taskId": input.task.taskId,
  };
  return fixedValues[source];
}

function isBoundedRulePrimitive(value: unknown): value is TaskVerificationRulePrimitive {
  if (typeof value === "string") {
    return value.length > 0
      && Buffer.byteLength(value, "utf8") <= 1_024
      && !/[\u0000-\u001f\u007f]/.test(value);
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
  }
  return typeof value === "boolean";
}

const PENDING_STATUSES = new Set(["pending", "processing", "queued"]);
const NEGATIVE_STATUSES = new Set(["failed", "ineligible", "negative", "rejected"]);
const POSITIVE_STATUSES = new Set(["completed", "confirmed", "success", "verified"]);

function matchResult(
  outcome: "failed" | "manual_review" | "pending",
  positiveMatch: false,
  diagnosticCodes: readonly string[],
): ProviderHttpResponseMatchResult {
  return Object.freeze({
    diagnosticCodes: Object.freeze([...diagnosticCodes]),
    outcome,
    positiveMatch,
  });
}

function resolveExpectation(
  rule: Readonly<Record<string, unknown>>,
  definition: TaskVerificationProviderBindingStrategy,
): {
  responseField: string;
  type: "boolean" | "number" | "string";
  value: TaskVerificationRulePrimitive;
} | undefined {
  const expectedField = rule.expectedField;
  const expectedType = rule.expectedType;
  const expectedValue = rule.expectedValue;

  if (
    typeof expectedField !== "string"
    || !/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(expectedField)
    || (expectedType !== "boolean" && expectedType !== "number" && expectedType !== "string")
    || typeof expectedValue !== expectedType
  ) {
    return undefined;
  }

  const responseField = definition.responseFieldAliases[expectedField];
  if (!responseField || !/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(responseField)) {
    return undefined;
  }

  return {
    responseField,
    type: expectedType,
    value: expectedValue as TaskVerificationRulePrimitive,
  };
}

function hasValidAuthority(input: TaskVerificationProviderRequestBuildInput): boolean {
  return Boolean(
    input
    && isServerIssuedTaskVerificationIdentity(input.identity)
    && input.identity.binding.bindingId === input.binding.id
    && input.identity.binding.bindingRevision === input.binding.revision
    && input.identity.campaignId === input.task.campaignId
    && input.identity.taskId === input.task.taskId
    && input.identity.taskRevision === input.task.revision
    && input.identity.taskRevisionDigest === input.task.taskRevisionDigest
    && input.identity.evidenceRuleDigest === input.task.evidenceRuleDigest
    && input.task.verificationType === input.binding.verificationType
    && typeof input.traceId === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(input.traceId)
  );
}

function definitionMatchesBinding(
  definition: TaskVerificationProviderBindingStrategy,
  binding: TaskVerificationBinding,
): boolean {
  return definition.providerFamily === binding.providerFamily
    && definition.requestMappingId === binding.requestMappingId
    && definition.responseMappingId === binding.responseMappingId
    && definition.verificationType === binding.verificationType
    && (definition.endpointId === undefined || definition.endpointId === binding.endpointId)
    && (definition.providerGroupId === undefined || definition.providerGroupId === binding.providerGroupId);
}

function validateAndFreezeBindingStrategy(
  definition: TaskVerificationProviderBindingStrategy,
): TaskVerificationProviderBindingStrategy {
  if (!isStrategyId(definition?.strategyId)) {
    throw new TaskVerificationProviderStrategyRegistryError(
      "TASK_VERIFICATION_STRATEGY_UNKNOWN",
    );
  }

  if (
    !definition
    || !Array.isArray(definition.allowedRuleFields)
    || definition.allowedRuleFields.some((field) =>
      typeof field !== "string" || !/^[A-Za-z][A-Za-z0-9]{0,63}$/.test(field))
    || !isPlainRecord(definition.requestMapping)
    || !Array.isArray(definition.requestMapping.fields)
    || !isPlainRecord(definition.responseFieldAliases)
    || typeof definition.providerFamily !== "string"
    || typeof definition.requestMappingId !== "string"
    || typeof definition.responseMappingId !== "string"
    || (definition.verificationType !== "ON_CHAIN" && definition.verificationType !== "DAPP_API")
  ) {
    throw new TaskVerificationProviderStrategyRegistryError(
      "TASK_VERIFICATION_STRATEGY_RESULT_INVALID",
    );
  }

  try {
    const requestMapping = normalizeProviderHttpCanonicalRequestMapping(
      definition.requestMapping,
    );
    const allowedRuleFields = new Set(definition.allowedRuleFields);
    if (requestMapping.fields.some(({ source }) =>
      source.startsWith("rule.") && !allowedRuleFields.has(source.slice("rule.".length)))) {
      throw new TaskVerificationProviderStrategyRegistryError(
        "TASK_VERIFICATION_STRATEGY_RESULT_INVALID",
      );
    }
    return freezeBindingStrategy({ ...definition, requestMapping });
  } catch {
    throw new TaskVerificationProviderStrategyRegistryError(
      "TASK_VERIFICATION_STRATEGY_RESULT_INVALID",
    );
  }
}

function freezeBindingStrategy(
  definition: TaskVerificationProviderBindingStrategy,
): TaskVerificationProviderBindingStrategy {
  return Object.freeze({
    ...definition,
    allowedRuleFields: Object.freeze([...definition.allowedRuleFields]),
    requestMapping: normalizeProviderHttpCanonicalRequestMapping(definition.requestMapping),
    responseFieldAliases: Object.freeze({ ...definition.responseFieldAliases }),
  });
}

function assertNoDuplicateDefinitions(
  definitions: readonly TaskVerificationProviderBindingStrategy[],
): void {
  const keys = new Set<string>();

  for (const definition of definitions) {
    const key = canonicalJson({
      endpointId: definition.endpointId ?? "*",
      providerFamily: definition.providerFamily,
      providerGroupId: definition.providerGroupId ?? "*",
      requestMappingId: definition.requestMappingId,
      responseMappingId: definition.responseMappingId,
      verificationType: definition.verificationType,
    });

    if (keys.has(key)) {
      throw new TaskVerificationProviderStrategyRegistryError(
        "TASK_VERIFICATION_STRATEGY_DUPLICATE",
      );
    }
    keys.add(key);
  }
}

function validateAndFreezeProtocolStrategy(
  strategy: TaskVerificationProviderProtocolStrategy,
): TaskVerificationProviderProtocolStrategy {
  if (!strategy || !isStrategyId(strategy.id) || Object.keys(strategy).some((key) => key !== "id")) {
    throw new TaskVerificationProviderStrategyRegistryError(
      "TASK_VERIFICATION_STRATEGY_UNKNOWN",
    );
  }
  return Object.freeze({ id: strategy.id });
}

function assertNoDuplicateProtocolStrategies(
  strategies: readonly TaskVerificationProviderProtocolStrategy[],
): void {
  const ids = new Set<TaskVerificationProviderStrategyId>();
  for (const strategy of strategies) {
    if (ids.has(strategy.id)) {
      throw new TaskVerificationProviderStrategyRegistryError(
        "TASK_VERIFICATION_STRATEGY_DUPLICATE",
      );
    }
    ids.add(strategy.id);
  }
}

function isStrategyId(value: unknown): value is TaskVerificationProviderStrategyId {
  return typeof value === "string"
    && (taskVerificationProviderStrategyIds as readonly string[]).includes(value);
}

function isSafeEvidenceHash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isSafeEvidenceRef(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 256
    && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
    && !/(authorization|credential|header|password|payload|secret|token|uri|url)/i.test(value);
}

function configReference(envKey: string): string {
  return `config-ref:${envKey.toLowerCase()}`;
}

function failedBuild(
  diagnosticCode: TaskVerificationProviderStrategyDiagnosticCode,
): TaskVerificationProviderRequestBuildResult {
  return Object.freeze({ diagnosticCode, ok: false as const });
}

function failedResolution(
  diagnosticCode: TaskVerificationProviderStrategyDiagnosticCode,
): TaskVerificationProviderStrategyResolution {
  return Object.freeze({ diagnosticCode, ok: false as const });
}

function createReadonlySet(values: readonly string[]): ReadonlySet<string> {
  const valuesSet = new Set(values);
  let readonlySet: ReadonlySet<string>;
  readonlySet = Object.freeze({
    entries: () => valuesSet.entries(),
    forEach: (
      callbackfn: (value: string, value2: string, set: ReadonlySet<string>) => void,
      thisArg?: unknown,
    ) => valuesSet.forEach((value) => callbackfn.call(thisArg, value, value, readonlySet)),
    has: (value: string) => valuesSet.has(value),
    keys: () => valuesSet.keys(),
    get size() {
      return valuesSet.size;
    },
    values: () => valuesSet.values(),
    [Symbol.iterator]: () => valuesSet[Symbol.iterator](),
  });
  return readonlySet;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

function versionedDigest(namespace: string, payload: string): string {
  return createHash("sha256")
    .update(`${namespace}\n${Buffer.byteLength(payload, "utf8")}\n`, "utf8")
    .update(payload, "utf8")
    .digest("hex");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
