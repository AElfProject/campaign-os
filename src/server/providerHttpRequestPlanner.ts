import { createHash } from "node:crypto";
import {
  findProviderHttpEndpointById,
  findProviderHttpEndpointForVerification,
} from "./providerHttpRuntimeRegistry";
import {
  containsUnsafeProviderHttpRuntimeMaterial,
  redactProviderHttpRuntimeValue,
} from "./providerHttpRuntimeRedaction";
import type {
  ProviderHttpEndpointEntry,
  ProviderHttpMethod,
  ProviderHttpRuntimeSummary,
  ProviderHttpVerificationType,
} from "./providerHttpRuntimeTypes";

export type ProviderHttpRequestPlannerDiagnosticCode =
  | "endpoint_blocked"
  | "endpoint_deferred"
  | "endpoint_disabled"
  | "endpoint_required_config_missing"
  | "endpoint_unsafe_rollout_metadata"
  | "invalid_attempt"
  | "invalid_matcher_context"
  | "invalid_request_material_ref"
  | "invalid_response_limit"
  | "invalid_strategy_id"
  | "invalid_timeout"
  | "missing_campaign_id"
  | "missing_idempotency_ref"
  | "missing_lease_ref"
  | "missing_request_material_ref"
  | "missing_task_id"
  | "missing_timeout_policy"
  | "missing_trace_id"
  | "provider_group_mismatch"
  | "runtime_not_activated"
  | "unknown_endpoint"
  | "unsafe_request_material"
  | "verification_type_mismatch";
export type ProviderHttpRequestPlannerDiagnosticSeverity = "blocker" | "warning";

export interface ProviderHttpRequestPlannerDiagnostic {
  code: ProviderHttpRequestPlannerDiagnosticCode;
  field: string;
  message: string;
  redactedFields: string[];
  redactedValue?: unknown;
  severity: ProviderHttpRequestPlannerDiagnosticSeverity;
}

export interface ProviderHttpAttemptMetadata {
  count: number;
  maxAttempts: number;
}

export interface ProviderHttpVerificationRequestInput {
  attempt: ProviderHttpAttemptMetadata;
  bodyHash?: string;
  bodyRef?: string;
  campaignId?: string;
  endpointId?: string;
  evidenceHash?: string;
  evidenceRef?: string;
  idempotencyRef?: string;
  leaseRef?: string;
  matcherContextDigest?: string;
  maxResponseBytes?: number;
  operatorContextRefs?: Record<string, string>;
  providerGroupId?: string;
  requestMaterialRef?: string;
  strategyId?: string;
  taskId?: string;
  traceId?: string;
  timeoutMs?: number;
  verificationType?: ProviderHttpVerificationType;
  walletAccountRef?: string;
  walletSessionRef?: string;
  [key: string]: unknown;
}

export interface ProviderHttpRequestPlan {
  attempt: ProviderHttpAttemptMetadata;
  bodyHash?: string;
  bodyRef?: string;
  campaignId: string;
  endpointId: string;
  evidenceHash?: string;
  evidenceRef?: string;
  headerRefs: string[];
  idempotencyRef: string;
  leaseRef: string;
  matcherContextDigest?: string;
  maxResponseBytes: number;
  method: ProviderHttpMethod;
  operatorContextRefs: Record<string, string>;
  providerGroupId: string;
  requestMaterialRef?: string;
  requestMappingId: string;
  requestDigest: string;
  responseMappingId: string;
  retryPolicyRef: string;
  strategyId?: string;
  taskId: string;
  timeoutMs: number;
  timeoutPolicyRef: string;
  traceId: string;
  urlRef: string;
  verificationType: ProviderHttpVerificationType;
  walletAccountRef?: string;
  walletSessionRef?: string;
}

export type ProviderHttpRequestPlanResult =
  | {
    diagnostics: [];
    ok: true;
    plan: ProviderHttpRequestPlan;
  }
  | {
    diagnostics: ProviderHttpRequestPlannerDiagnostic[];
    ok: false;
    plan?: undefined;
  };

const allowedRequestKeys = new Set([
  "attempt",
  "bodyHash",
  "bodyRef",
  "campaignId",
  "endpointId",
  "evidenceHash",
  "evidenceRef",
  "idempotencyRef",
  "leaseRef",
  "matcherContextDigest",
  "maxResponseBytes",
  "operatorContextRefs",
  "providerGroupId",
  "requestMaterialRef",
  "strategyId",
  "taskId",
  "traceId",
  "timeoutMs",
  "verificationType",
  "walletAccountRef",
  "walletSessionRef",
]);

export const planProviderHttpRequest = (
  input: ProviderHttpVerificationRequestInput,
  runtime: ProviderHttpRuntimeSummary,
  registry: readonly ProviderHttpEndpointEntry[] = runtime.endpointRegistry,
): ProviderHttpRequestPlanResult => {
  const diagnostics: ProviderHttpRequestPlannerDiagnostic[] = [];

  if (runtime.status !== "activated" || runtime.activationStatus !== "explicitly_enabled") {
    diagnostics.push(
      diagnostic(
        "runtime_not_activated",
        "runtime",
        "Provider HTTP runtime must be explicitly activated before request planning.",
      ),
    );
  }

  diagnostics.push(...validateRequiredFields(input));
  diagnostics.push(...validateAttempt(input.attempt));
  diagnostics.push(...validateExecutionBounds(input));
  diagnostics.push(...validateStrategyContext(input));
  diagnostics.push(...detectUnsafeRequestMaterial(input));

  const endpoint = input.endpointId
    ? findProviderHttpEndpointById(input.endpointId, registry)
    : undefined;

  if (!endpoint) {
    diagnostics.push(
      diagnostic(
        "unknown_endpoint",
        "endpointId",
        "Provider HTTP endpoint id is not registered.",
        input.endpointId,
      ),
    );
  } else {
    diagnostics.push(...validateEndpointRollout(endpoint));
    diagnostics.push(...detectUnsafeEndpointRolloutMetadata(endpoint));

    if (endpoint.providerGroupId !== input.providerGroupId) {
      diagnostics.push(
        diagnostic(
          "provider_group_mismatch",
          "providerGroupId",
          "Provider HTTP endpoint does not belong to the requested provider group.",
          input.providerGroupId,
        ),
      );
    }

    if (
      input.verificationType
      && endpoint.rolloutStatus === "enabled"
      && !findProviderHttpEndpointForVerification(
        {
          endpointId: endpoint.endpointId,
          providerGroupId: String(input.providerGroupId ?? ""),
          verificationType: input.verificationType,
        },
        registry,
      )
    ) {
      diagnostics.push(
        diagnostic(
          "verification_type_mismatch",
          "verificationType",
          "Provider HTTP endpoint does not support the requested verification type.",
          input.verificationType,
        ),
      );
    }

    if (!hasPresentValue(endpoint.timeoutPolicyRef)) {
      diagnostics.push(
        diagnostic(
          "missing_timeout_policy",
          "timeoutPolicyRef",
          "Provider HTTP endpoint must include a timeout policy reference.",
        ),
      );
    }
  }

  if (diagnostics.length > 0 || !endpoint) {
    return { diagnostics, ok: false };
  }

  const planWithoutDigest: Omit<ProviderHttpRequestPlan, "requestDigest"> = {
    attempt: {
      count: input.attempt.count,
      maxAttempts: input.attempt.maxAttempts,
    },
    bodyHash: sanitizeOptionalRef(input.bodyHash),
    bodyRef: sanitizeOptionalRef(input.bodyRef),
    campaignId: input.campaignId!,
    endpointId: endpoint.endpointId,
    evidenceHash: sanitizeOptionalRef(input.evidenceHash),
    evidenceRef: sanitizeOptionalRef(input.evidenceRef),
    headerRefs: [...endpoint.headerRefs],
    idempotencyRef: input.idempotencyRef!,
    leaseRef: input.leaseRef!,
    matcherContextDigest: sanitizeOptionalRef(input.matcherContextDigest),
    maxResponseBytes: input.maxResponseBytes ?? 256 * 1024,
    method: endpoint.method,
    operatorContextRefs: { ...(input.operatorContextRefs ?? {}) },
    providerGroupId: endpoint.providerGroupId,
    requestMaterialRef: sanitizeOptionalRef(input.requestMaterialRef),
    requestMappingId: endpoint.requestMappingId,
    responseMappingId: endpoint.responseMappingId,
    retryPolicyRef: endpoint.retryPolicyRef,
    strategyId: sanitizeOptionalRef(input.strategyId),
    taskId: input.taskId!,
    timeoutMs: input.timeoutMs ?? parseTimeoutMs(endpoint.timeoutPolicyRef),
    timeoutPolicyRef: endpoint.timeoutPolicyRef,
    traceId: input.traceId!,
    urlRef: endpoint.urlTemplateRef,
    verificationType: input.verificationType!,
    walletAccountRef: sanitizeOptionalRef(input.walletAccountRef),
    walletSessionRef: sanitizeOptionalRef(input.walletSessionRef),
  };

  return {
    diagnostics: [],
    ok: true,
    plan: {
      ...planWithoutDigest,
      requestDigest: createCanonicalProviderHttpRequestDigest(planWithoutDigest),
    },
  };
};

export const createCanonicalProviderHttpRequestDigest = (
  input: Readonly<Record<string, unknown>>,
): string => {
  const safeInput = Object.fromEntries(
    Object.entries(input).filter(([key]) => key !== "requestDigest"),
  );
  const canonical = canonicalJson(safeInput);

  return createHash("sha256")
    .update(
      `campaign-os/provider-http-request/v1\n${Buffer.byteLength(canonical, "utf8")}\n`,
      "utf8",
    )
    .update(canonical, "utf8")
    .digest("hex");
};

const validateRequiredFields = (
  input: ProviderHttpVerificationRequestInput,
): ProviderHttpRequestPlannerDiagnostic[] => {
  const diagnostics: ProviderHttpRequestPlannerDiagnostic[] = [];

  if (!hasPresentValue(input.traceId)) {
    diagnostics.push(diagnostic("missing_trace_id", "traceId", "Trace id is required."));
  }

  if (!hasPresentValue(input.campaignId)) {
    diagnostics.push(diagnostic("missing_campaign_id", "campaignId", "Campaign id is required."));
  }

  if (!hasPresentValue(input.taskId)) {
    diagnostics.push(diagnostic("missing_task_id", "taskId", "Task id is required."));
  }

  if (!hasPresentValue(input.idempotencyRef)) {
    diagnostics.push(
      diagnostic(
        "missing_idempotency_ref",
        "idempotencyRef",
        "Idempotency reference is required before provider HTTP planning.",
      ),
    );
  }

  if (!hasPresentValue(input.leaseRef)) {
    diagnostics.push(
      diagnostic(
        "missing_lease_ref",
        "leaseRef",
        "Lease reference is required before provider HTTP planning.",
      ),
    );
  }

  return diagnostics;
};

const validateAttempt = (
  attempt: ProviderHttpAttemptMetadata | undefined,
): ProviderHttpRequestPlannerDiagnostic[] => {
  if (
    !attempt
    || !Number.isInteger(attempt.count)
    || !Number.isInteger(attempt.maxAttempts)
    || attempt.count < 1
    || attempt.maxAttempts < 1
    || attempt.count > attempt.maxAttempts
  ) {
    return [
      diagnostic(
        "invalid_attempt",
        "attempt",
        "Attempt metadata must include count and maxAttempts in range.",
      ),
    ];
  }

  return [];
};

const validateExecutionBounds = (
  input: ProviderHttpVerificationRequestInput,
): ProviderHttpRequestPlannerDiagnostic[] => {
  const diagnostics: ProviderHttpRequestPlannerDiagnostic[] = [];

  if (
    input.timeoutMs !== undefined
    && (!Number.isSafeInteger(input.timeoutMs) || input.timeoutMs < 100 || input.timeoutMs > 10_000)
  ) {
    diagnostics.push(diagnostic(
      "invalid_timeout",
      "timeoutMs",
      "Provider HTTP timeout must be an integer from 100 to 10000 milliseconds.",
    ));
  }

  if (
    input.maxResponseBytes !== undefined
    && (
      !Number.isSafeInteger(input.maxResponseBytes)
      || input.maxResponseBytes < 1_024
      || input.maxResponseBytes > 256 * 1024
    )
  ) {
    diagnostics.push(diagnostic(
      "invalid_response_limit",
      "maxResponseBytes",
      "Provider HTTP response limit must be an integer from 1024 to 262144 bytes.",
    ));
  }

  return diagnostics;
};

const validateStrategyContext = (
  input: ProviderHttpVerificationRequestInput,
): ProviderHttpRequestPlannerDiagnostic[] => {
  const diagnostics: ProviderHttpRequestPlannerDiagnostic[] = [];

  if (
    input.matcherContextDigest !== undefined
    && !/^[a-f0-9]{64}$/.test(input.matcherContextDigest)
  ) {
    diagnostics.push(diagnostic(
      "invalid_matcher_context",
      "matcherContextDigest",
      "Provider HTTP matcher context digest is invalid.",
    ));
  }

  if (
    input.strategyId !== undefined
    && !/^[a-z][a-z0-9-]{0,63}$/.test(input.strategyId)
  ) {
    diagnostics.push(diagnostic(
      "invalid_strategy_id",
      "strategyId",
      "Provider HTTP strategy id is invalid.",
    ));
  }

  if (input.strategyId !== undefined && !hasPresentValue(input.requestMaterialRef)) {
    diagnostics.push(diagnostic(
      "missing_request_material_ref",
      "requestMaterialRef",
      "Provider HTTP strategy requires a canonical request material reference.",
    ));
  }

  if (
    input.requestMaterialRef !== undefined
    && !/^request-ref:[a-f0-9]{64}$/.test(input.requestMaterialRef)
  ) {
    diagnostics.push(diagnostic(
      "invalid_request_material_ref",
      "requestMaterialRef",
      "Provider HTTP canonical request material reference is invalid.",
    ));
  }

  if (input.requestMaterialRef !== undefined && input.strategyId === undefined) {
    diagnostics.push(diagnostic(
      "invalid_request_material_ref",
      "requestMaterialRef",
      "Provider HTTP canonical request material reference requires a strategy.",
    ));
  }

  return diagnostics;
};

const detectUnsafeRequestMaterial = (
  input: ProviderHttpVerificationRequestInput,
): ProviderHttpRequestPlannerDiagnostic[] => {
  const unsafeFields = new Set<string>();

  Object.entries(input).forEach(([key, value]) => {
    if (!allowedRequestKeys.has(key)) {
      unsafeFields.add(key);
      return;
    }

    if (allowedRequestKeys.has(key) && key !== "attempt" && containsUnsafeSafeFieldValue(value)) {
      unsafeFields.add(key);
    }
  });

  Object.entries(input.operatorContextRefs ?? {}).forEach(([key, value]) => {
    if (isUnsafeRequestKey(key) || containsUnsafeProviderHttpRuntimeMaterial(value)) {
      unsafeFields.add(`operatorContextRefs.${key}`);
    }
  });

  return [...unsafeFields].map((field) =>
    diagnostic(
      "unsafe_request_material",
      field,
      "Provider HTTP request input contains unsafe material and was redacted.",
      readPath(input, field),
    )
  );
};

const validateEndpointRollout = (
  endpoint: ProviderHttpEndpointEntry,
): ProviderHttpRequestPlannerDiagnostic[] => {
  const diagnostics: ProviderHttpRequestPlannerDiagnostic[] = [];

  if (endpoint.rolloutStatus === "deferred") {
    diagnostics.push(
      diagnostic(
        "endpoint_deferred",
        "rolloutStatus",
        "Provider HTTP endpoint rollout is deferred and cannot be planned.",
      ),
    );
  }

  if (endpoint.rolloutStatus === "disabled") {
    diagnostics.push(
      diagnostic(
        "endpoint_disabled",
        "rolloutStatus",
        "Provider HTTP endpoint rollout is disabled and cannot be planned.",
      ),
    );
  }

  if (endpoint.rolloutStatus === "blocked") {
    diagnostics.push(
      diagnostic(
        "endpoint_blocked",
        "rolloutStatus",
        "Provider HTTP endpoint rollout is blocked and cannot be planned.",
      ),
    );
  }

  const missingConfigKeys = endpoint.requiredConfigKeys.filter((key) => !hasPresentValue(key));

  if (missingConfigKeys.length > 0) {
    diagnostics.push(
      diagnostic(
        "endpoint_required_config_missing",
        "requiredConfigKeys",
        "Provider HTTP endpoint rollout requires non-empty config references.",
      ),
    );
  }

  return diagnostics;
};

const detectUnsafeEndpointRolloutMetadata = (
  endpoint: ProviderHttpEndpointEntry,
): ProviderHttpRequestPlannerDiagnostic[] => {
  const unsafeFields = [
    "credentialRef",
    "requestMappingId",
    "responseMappingId",
    "retryPolicyRef",
    "timeoutPolicyRef",
    "urlTemplateRef",
    ...endpoint.headerRefs.map((_, index) => `headerRefs.${index}`),
    ...endpoint.requiredConfigKeys.map((_, index) => `requiredConfigKeys.${index}`),
  ].filter((field) => isUnsafeEndpointRolloutField(field, readEndpointPath(endpoint, field)));

  if (unsafeFields.length === 0) {
    return [];
  }

  return [
    {
      code: "endpoint_unsafe_rollout_metadata",
      field: "endpointRegistry",
      message: "Provider HTTP endpoint rollout metadata contains unsafe material and was redacted.",
      redactedFields: unsafeFields.map((field) => `${endpoint.endpointId}.${field}`),
      redactedValue: redactProviderHttpRuntimeValue(
        Object.fromEntries(unsafeFields.map((field) => [field, readEndpointPath(endpoint, field)])),
      ),
      severity: "blocker",
    },
  ];
};

const containsUnsafeSafeFieldValue = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "object" && !(value instanceof Error)) {
    return containsUnsafeProviderHttpRuntimeMaterial(value);
  }

  return containsUnsafeProviderHttpRuntimeMaterial(value);
};

const isUnsafeEndpointRolloutField = (field: string, value: unknown): boolean => {
  if (field === "urlTemplateRef" && typeof value === "string" && /^https?:\/\//i.test(value)) {
    return true;
  }

  return containsUnsafeProviderHttpRuntimeMaterial(value);
};

const isUnsafeRequestKey = (key: string): boolean =>
  /authorization|api[-_]?key|bearer|credential(?!Ref)|object[-_]?key|private[-_]?key|raw|request[-_]?body|response[-_]?body|signed[-_]?url|stack|token|wallet[-_]?private/i.test(
    key,
  );

function diagnostic(
  code: ProviderHttpRequestPlannerDiagnosticCode,
  field: string,
  message: string,
  value?: unknown,
): ProviderHttpRequestPlannerDiagnostic {
  return {
    code,
    field,
    message,
    redactedFields: value === undefined ? [] : [field],
    redactedValue: value === undefined ? undefined : redactProviderHttpRuntimeValue(value),
    severity: "blocker",
  };
}

function hasPresentValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function sanitizeOptionalRef(value: string | undefined): string | undefined {
  return value && !containsUnsafeProviderHttpRuntimeMaterial(value) ? value : undefined;
}

function parseTimeoutMs(timeoutPolicyRef: string): number {
  const match = timeoutPolicyRef.match(/(\d+)\s*ms/i);

  if (!match) {
    return 2500;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 2500;
}

function readPath(source: ProviderHttpVerificationRequestInput, path: string): unknown {
  return path.split(".").reduce<unknown>((value, part) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as Record<string, unknown>)[part];
  }, source);
}

function readEndpointPath(endpoint: ProviderHttpEndpointEntry, path: string): unknown {
  return path.split(".").reduce<unknown>((value, part) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value[Number(part)];
    }

    return (value as Record<string, unknown>)[part];
  }, endpoint);
}

function canonicalJson(value: unknown): string {
  if (value === undefined) {
    return "null";
  }

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
