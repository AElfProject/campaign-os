import { createHash } from "node:crypto";
import { containsUnsafeProviderHttpRuntimeMaterial } from "./providerHttpRuntimeRedaction";
import type { ProviderHttpRequestPlan } from "./providerHttpRequestPlanner";
import { providerHttpEndpointRegistry } from "./providerHttpRuntimeRegistry";
import type { ProviderHttpTransportResult } from "./providerHttpTransport";
import type { ProviderHttpDownstreamLiveFlags, ProviderHttpOutcome } from "./providerHttpRuntimeTypes";

export type ProviderHttpResponseDiagnosticCode =
  | "http_auth_or_config_failure"
  | "http_caller_aborted"
  | "http_conflict"
  | "http_empty_response"
  | "http_fetch_failed"
  | "http_malformed_response"
  | "http_matcher_failed"
  | "http_matcher_missing"
  | "http_missing_evidence"
  | "http_non_retryable_failure"
  | "http_provider_unavailable"
  | "http_rate_limited"
  | "http_request_mapping_failure"
  | "http_response_too_large"
  | "http_response_structure_exceeded"
  | "http_runtime_aborted"
  | "http_timeout"
  | "http_transport_closed"
  | "http_unsafe_response_material"
  | "http_unsupported_content_type"
  | "http_unsupported_response_mapping";

export type ProviderHttpRetryPosture =
  | "blocked"
  | "exhausted"
  | "none"
  | "not_retried"
  | "retry_scheduled";
export type ProviderHttpDegradationDecision =
  | "blocked"
  | "disable_provider_task_templates"
  | "manual_review"
  | "pending";
export type ProviderHttpIdempotencyDecision =
  | "blocked"
  | "duplicate_drop"
  | "existing_completion"
  | "manual_review"
  | "unique";
export type ProviderHttpLeaseDecision = "acquired" | "blocked" | "conflict" | "manual_review" | "retry";

export interface ProviderHttpResponseDiagnostic {
  code: string;
  field: string;
  message: string;
  redactedFields: string[];
  severity: "blocker" | "error" | "info" | "warning";
}

export interface ProviderHttpNormalizationPolicy {
  abortedOutcome?: "manual_review" | "pending";
  degradationOutcome?: "blocked" | "manual_review" | "pending";
  missingEvidenceOutcome?: "blocked" | "manual_review" | "pending";
  notFoundOutcome?: "failed" | "manual_review";
  retryExhaustedOutcome?: "manual_review" | "disable_provider_task_templates";
  unsupportedMappingOutcome?: "blocked" | "manual_review";
}

export interface ProviderHttpResponseMatchInput {
  readonly body: unknown;
  readonly statusCode: number;
  readonly transportExecuted: boolean;
}

export interface ProviderHttpResponseMatchResult {
  readonly diagnosticCodes: readonly string[];
  readonly evidenceHash?: string;
  readonly evidenceRef?: string;
  readonly outcome: "completed" | "failed" | "manual_review" | "pending";
  readonly positiveMatch: boolean;
}

export type ProviderHttpResponseMatcher = (
  input: ProviderHttpResponseMatchInput,
) => ProviderHttpResponseMatchResult;

export interface ProviderHttpNormalizedResult {
  degradationDecision: ProviderHttpDegradationDecision;
  diagnosticCodes: string[];
  diagnostics: ProviderHttpResponseDiagnostic[];
  downstreamLiveFlags: ProviderHttpDownstreamLiveFlags;
  endpointId: string;
  evidenceHash?: string;
  evidenceRef?: string;
  httpStatusCode?: number;
  idempotencyDecision: ProviderHttpIdempotencyDecision;
  leaseDecision: ProviderHttpLeaseDecision;
  liveHttpCallsAttempted: boolean;
  outcome: ProviderHttpOutcome;
  positiveMatch: boolean;
  providerGroupId: string;
  requestPlanRedacted: ProviderHttpRequestPlan;
  resultDigest: string;
  retryPosture: ProviderHttpRetryPosture;
  taskId: string;
  traceId: string;
  transportDurationMs?: number;
  transportExecuted: boolean;
}

const supportedResponseMappingIds = immutableReadonlySet(
  providerHttpEndpointRegistry
    .filter(({ rolloutStatus }) => rolloutStatus === "enabled")
    .map(({ responseMappingId }) => responseMappingId),
);

export const providerHttpResponseNormalizerSupportedMappingIds: ReadonlySet<string> =
  supportedResponseMappingIds;

export const normalizeProviderHttpResponse = (
  plan: ProviderHttpRequestPlan,
  transportResult: ProviderHttpTransportResult,
  policy: ProviderHttpNormalizationPolicy = {},
  matcher?: ProviderHttpResponseMatcher,
): ProviderHttpNormalizedResult => {
  const transportFailure = normalizeTransportFailure(plan, transportResult, policy);
  if (transportFailure) {
    return transportFailure;
  }

  const statusCode = transportResult.statusCode;
  if (statusCode === undefined) {
    return createResult(plan, transportResult, {
      degradationDecision: "blocked",
      diagnostics: [
        diagnostic("http_malformed_response", "statusCode", "Provider HTTP response omitted status code."),
      ],
      outcome: "blocked",
      positiveMatch: false,
      retryPosture: "blocked",
    });
  }

  if (statusCode >= 200 && statusCode < 300 && !supportedResponseMappingIds.has(plan.responseMappingId)) {
    const outcome = policy.unsupportedMappingOutcome ?? "blocked";
    return createResult(plan, transportResult, {
      degradationDecision: outcome,
      diagnostics: [
        diagnostic(
          "http_unsupported_response_mapping",
          "responseMappingId",
          "Provider HTTP response mapping is not supported by this runtime.",
        ),
      ],
      outcome,
      positiveMatch: false,
      retryPosture: "blocked",
    });
  }

  if (
    statusCode === 202
    || (statusCode >= 200 && statusCode < 300 && isPendingBody(transportResult.body))
  ) {
    return createResult(plan, transportResult, {
      degradationDecision: "pending",
      diagnostics: [],
      outcome: "pending",
      positiveMatch: false,
      retryPosture: "none",
    });
  }

  if (statusCode >= 200 && statusCode < 300) {
    return normalizeSuccessfulResponse(plan, transportResult, policy, matcher);
  }

  if (statusCode === 400) {
    return createResult(plan, transportResult, {
      degradationDecision: "blocked",
      diagnostics: [
        diagnostic("http_request_mapping_failure", "statusCode", "Provider HTTP request mapping failed."),
      ],
      outcome: "blocked",
      positiveMatch: false,
      retryPosture: "blocked",
    });
  }

  if (statusCode === 401 || statusCode === 403) {
    return createResult(plan, transportResult, {
      degradationDecision: "blocked",
      diagnostics: [
        diagnostic("http_auth_or_config_failure", "statusCode", "Provider HTTP auth/config failed."),
      ],
      outcome: "blocked",
      positiveMatch: false,
      retryPosture: "blocked",
    });
  }

  if (statusCode === 404) {
    const outcome = policy.notFoundOutcome ?? "failed";
    return createResult(plan, transportResult, {
      degradationDecision: outcome === "manual_review" ? "manual_review" : "blocked",
      diagnostics: [
        diagnostic("http_non_retryable_failure", "statusCode", "Provider HTTP evidence was not found."),
      ],
      outcome,
      positiveMatch: false,
      retryPosture: "blocked",
    });
  }

  if (statusCode === 409) {
    return createResult(plan, transportResult, {
      degradationDecision: "blocked",
      diagnostics: [
        diagnostic("http_conflict", "statusCode", "Provider HTTP response reported conflict posture."),
      ],
      idempotencyDecision: "duplicate_drop",
      leaseDecision: "conflict",
      outcome: "blocked",
      positiveMatch: false,
      retryPosture: "blocked",
    });
  }

  if (statusCode === 429) {
    return unavailableResult(
      plan,
      transportResult,
      "http_rate_limited",
      "Provider HTTP response was rate limited.",
      policy,
    );
  }

  if (statusCode >= 500) {
    return unavailableResult(
      plan,
      transportResult,
      "http_provider_unavailable",
      "Provider HTTP service is unavailable.",
      policy,
    );
  }

  return createResult(plan, transportResult, {
    degradationDecision: "blocked",
    diagnostics: [
      diagnostic("http_non_retryable_failure", "statusCode", "Provider HTTP response is non-retryable."),
    ],
    outcome: "failed",
    positiveMatch: false,
    retryPosture: "blocked",
  });
};

const normalizeSuccessfulResponse = (
  plan: ProviderHttpRequestPlan,
  transportResult: ProviderHttpTransportResult,
  policy: ProviderHttpNormalizationPolicy,
  matcher: ProviderHttpResponseMatcher | undefined,
): ProviderHttpNormalizedResult => {
  if (!isPlainRecord(transportResult.body)) {
    return createResult(plan, transportResult, {
      degradationDecision: "manual_review",
      diagnostics: [
        diagnostic("http_malformed_response", "body", "Provider HTTP response body is malformed."),
      ],
      outcome: "manual_review",
      positiveMatch: false,
      retryPosture: "blocked",
    });
  }

  if (!hasBoundedJsonStructure(transportResult.body)) {
    return createResult(plan, transportResult, {
      degradationDecision: "manual_review",
      diagnostics: [
        diagnostic(
          "http_response_structure_exceeded",
          "body",
          "Provider HTTP response structure exceeded safe bounds.",
          ["body"],
        ),
      ],
      outcome: "manual_review",
      positiveMatch: false,
      retryPosture: "blocked",
    });
  }

  if (containsUnsafeProviderHttpRuntimeMaterial(transportResult.body)) {
    return createResult(plan, transportResult, {
      degradationDecision: "manual_review",
      diagnostics: [
        diagnostic(
          "http_unsafe_response_material",
          "body",
          "Provider HTTP response contained unsafe material and was discarded.",
          ["body"],
        ),
      ],
      outcome: "manual_review",
      positiveMatch: false,
      retryPosture: "blocked",
    });
  }

  if (!matcher) {
    return createResult(plan, transportResult, {
      degradationDecision: "manual_review",
      diagnostics: [
        diagnostic("http_matcher_missing", "matcher", "Provider HTTP positive matcher is required."),
      ],
      outcome: "manual_review",
      positiveMatch: false,
      retryPosture: "blocked",
    });
  }

  let match: unknown;
  try {
    match = matcher({
      body: transportResult.body,
      statusCode: transportResult.statusCode!,
      transportExecuted: true,
    });
  } catch {
    return invalidMatcherResult(plan, transportResult, "http_matcher_failed", policy);
  }

  if (!isValidMatchResult(match)) {
    return invalidMatcherResult(
      plan,
      transportResult,
      isPositiveMatchWithoutEvidence(match)
        ? "http_missing_evidence"
        : "http_matcher_failed",
      policy,
    );
  }

  if (isMissingEvidenceMatch(match)) {
    return missingEvidenceResult(plan, transportResult, policy);
  }

  const matchDiagnostics = match.diagnosticCodes.map((code) =>
    diagnostic(code, "matcher", "Provider HTTP matcher selected a safe outcome."));
  const degradationDecision = degradationForMatchOutcome(match.outcome);

  return createResult(plan, transportResult, {
    degradationDecision,
    diagnostics: matchDiagnostics,
    evidenceHash: match.evidenceHash,
    evidenceRef: match.evidenceRef,
    outcome: match.outcome,
    positiveMatch: match.positiveMatch,
    retryPosture: match.outcome === "completed" ? "none" : "blocked",
  });
};

const normalizeTransportFailure = (
  plan: ProviderHttpRequestPlan,
  transportResult: ProviderHttpTransportResult,
  policy: ProviderHttpNormalizationPolicy,
): ProviderHttpNormalizedResult | undefined => {
  const code = transportResult.diagnostic?.code;

  if (transportResult.timedOut || code === "timeout" || transportResult.statusCode === 408) {
    const outcome = policy.degradationOutcome ?? "pending";
    return createResult(plan, transportResult, {
      degradationDecision: outcome,
      diagnostics: [diagnostic("http_timeout", "transport", "Provider HTTP request timed out.")],
      outcome,
      positiveMatch: false,
      retryPosture: retryPostureForDegradation(outcome),
    });
  }

  if (
    transportResult.statusCode !== undefined
    && transportResult.statusCode >= 400
    && (
      code === "empty_body"
      || code === "malformed_json"
      || code === "response_too_large"
      || code === "unsupported_content_type"
    )
  ) {
    return undefined;
  }

  const transportFailureByCode: Partial<Record<
    NonNullable<typeof code>,
    {
      diagnosticCode: ProviderHttpResponseDiagnosticCode;
      outcome: "blocked" | "manual_review" | "pending";
    }
  >> = {
    caller_aborted: {
      diagnosticCode: "http_caller_aborted",
      outcome: policy.abortedOutcome ?? "pending",
    },
    empty_body: { diagnosticCode: "http_empty_response", outcome: "manual_review" },
    fetch_failed: { diagnosticCode: "http_fetch_failed", outcome: "pending" },
    malformed_json: { diagnosticCode: "http_malformed_response", outcome: "manual_review" },
    material_resolution_failed: { diagnosticCode: "http_auth_or_config_failure", outcome: "blocked" },
    production_transport_unpinned: { diagnosticCode: "http_auth_or_config_failure", outcome: "blocked" },
    response_too_large: { diagnosticCode: "http_response_too_large", outcome: "manual_review" },
    runtime_aborted: { diagnosticCode: "http_runtime_aborted", outcome: "pending" },
    transport_closed: { diagnosticCode: "http_transport_closed", outcome: "pending" },
    unsupported_content_type: {
      diagnosticCode: "http_unsupported_content_type",
      outcome: "manual_review",
    },
  };
  const failure = code ? transportFailureByCode[code] : undefined;
  if (!failure) {
    return undefined;
  }

  return createResult(plan, transportResult, {
    degradationDecision: failure.outcome === "blocked" ? "blocked" : failure.outcome,
    diagnostics: [
      diagnostic(failure.diagnosticCode, "transport", "Provider HTTP transport returned a safe failure posture."),
    ],
    outcome: failure.outcome,
    positiveMatch: false,
    retryPosture: failure.outcome === "pending" ? "not_retried" : "blocked",
  });
};

const unavailableResult = (
  plan: ProviderHttpRequestPlan,
  transportResult: ProviderHttpTransportResult,
  code: ProviderHttpResponseDiagnosticCode,
  message: string,
  policy: ProviderHttpNormalizationPolicy,
): ProviderHttpNormalizedResult => {
  const exhausted = plan.attempt.count >= plan.attempt.maxAttempts;
  const outcome = policy.degradationOutcome
    ?? (exhausted ? policy.retryExhaustedOutcome ?? "manual_review" : "pending");

  return createResult(plan, transportResult, {
    degradationDecision: outcome,
    diagnostics: [diagnostic(code, "statusCode", message)],
    outcome,
    positiveMatch: false,
    retryPosture: policy.degradationOutcome
      ? retryPostureForDegradation(policy.degradationOutcome)
      : exhausted ? "exhausted" : "not_retried",
  });
};

const invalidMatcherResult = (
  plan: ProviderHttpRequestPlan,
  transportResult: ProviderHttpTransportResult,
  code: Extract<ProviderHttpResponseDiagnosticCode, "http_matcher_failed" | "http_missing_evidence">,
  policy: ProviderHttpNormalizationPolicy,
): ProviderHttpNormalizedResult => code === "http_missing_evidence"
  ? missingEvidenceResult(plan, transportResult, policy)
  : createResult(plan, transportResult, {
    degradationDecision: "manual_review",
    diagnostics: [
      diagnostic(code, "matcher", "Provider HTTP matcher result failed closed."),
    ],
    outcome: "manual_review",
    positiveMatch: false,
    retryPosture: "blocked",
  });

const missingEvidenceResult = (
  plan: ProviderHttpRequestPlan,
  transportResult: ProviderHttpTransportResult,
  policy: ProviderHttpNormalizationPolicy,
): ProviderHttpNormalizedResult => {
  const outcome = policy.missingEvidenceOutcome
    ?? policy.degradationOutcome
    ?? "manual_review";
  return createResult(plan, transportResult, {
    degradationDecision: outcome,
    diagnostics: [
      diagnostic("http_missing_evidence", "matcher", "Provider HTTP evidence was missing or invalid."),
    ],
    outcome,
    positiveMatch: false,
    retryPosture: retryPostureForDegradation(outcome),
  });
};

const createResult = (
  plan: ProviderHttpRequestPlan,
  transportResult: ProviderHttpTransportResult,
  input: {
    degradationDecision: ProviderHttpDegradationDecision;
    diagnostics: ProviderHttpResponseDiagnostic[];
    evidenceHash?: string;
    evidenceRef?: string;
    idempotencyDecision?: ProviderHttpIdempotencyDecision;
    leaseDecision?: ProviderHttpLeaseDecision;
    outcome: ProviderHttpOutcome;
    positiveMatch: boolean;
    retryPosture: ProviderHttpRetryPosture;
  },
): ProviderHttpNormalizedResult => {
  const diagnosticCodes = input.diagnostics.map(({ code }) => code);
  const resultDigest = createProviderHttpNormalizedResultDigest({
    diagnosticCodes,
    evidenceHash: input.evidenceHash,
    evidenceRef: input.evidenceRef,
    outcome: input.outcome,
    positiveMatch: input.positiveMatch,
    requestDigest: plan.requestDigest,
    traceId: plan.traceId,
  });

  return {
    degradationDecision: input.degradationDecision,
    diagnosticCodes,
    diagnostics: input.diagnostics,
    downstreamLiveFlags: disabledDownstreamFlags(),
    endpointId: plan.endpointId,
    ...(input.evidenceHash === undefined ? {} : { evidenceHash: input.evidenceHash }),
    ...(input.evidenceRef === undefined ? {} : { evidenceRef: input.evidenceRef }),
    ...(transportResult.statusCode === undefined ? {} : { httpStatusCode: transportResult.statusCode }),
    idempotencyDecision: input.idempotencyDecision ?? "unique",
    leaseDecision: input.leaseDecision ?? "acquired",
    liveHttpCallsAttempted: true,
    outcome: input.outcome,
    positiveMatch: input.positiveMatch,
    providerGroupId: plan.providerGroupId,
    requestPlanRedacted: clonePlan(plan),
    resultDigest,
    retryPosture: input.retryPosture,
    taskId: plan.taskId,
    traceId: plan.traceId,
    transportDurationMs: transportResult.durationMs,
    transportExecuted: true,
  };
};

export const createProviderHttpNormalizedResultDigest = (
  input: Readonly<Record<string, unknown>>,
): string => {
  const canonical = canonicalJson(input);
  return createHash("sha256")
    .update(
      `campaign-os/provider-http-normalized-result/v1\n${Buffer.byteLength(canonical, "utf8")}\n`,
      "utf8",
    )
    .update(canonical, "utf8")
    .digest("hex");
};

function isValidMatchResult(value: unknown): value is ProviderHttpResponseMatchResult {
  if (!isPlainRecord(value)) {
    return false;
  }

  const match = value as unknown as ProviderHttpResponseMatchResult;
  if (
    !Array.isArray(match.diagnosticCodes)
    || match.diagnosticCodes.length > 16
    || match.diagnosticCodes.some((code) =>
      typeof code !== "string" || !/^[A-Z][A-Z0-9_]{0,63}$/.test(code))
    || !["completed", "failed", "manual_review", "pending"].includes(match.outcome)
    || typeof match.positiveMatch !== "boolean"
  ) {
    return false;
  }

  if (match.outcome === "completed") {
    return match.positiveMatch
      && isSafeEvidenceHash(match.evidenceHash)
      && isSafeEvidenceRef(match.evidenceRef);
  }

  return !match.positiveMatch
    && match.evidenceHash === undefined
    && match.evidenceRef === undefined;
}

function isPositiveMatchWithoutEvidence(value: unknown): boolean {
  return isPlainRecord(value)
    && value.positiveMatch === true
    && value.outcome === "completed"
    && (!isSafeEvidenceHash(value.evidenceHash) || !isSafeEvidenceRef(value.evidenceRef));
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

function degradationForMatchOutcome(
  outcome: ProviderHttpResponseMatchResult["outcome"],
): ProviderHttpDegradationDecision {
  if (outcome === "pending") {
    return "pending";
  }
  if (outcome === "manual_review") {
    return "manual_review";
  }
  return "blocked";
}

function diagnostic(
  code: string,
  field: string,
  message: string,
  redactedFields: string[] = [],
): ProviderHttpResponseDiagnostic {
  return {
    code,
    field,
    message,
    redactedFields,
    severity: code === "PROVIDER_MATCH_POSITIVE"
      ? "info"
      : code === "http_provider_unavailable"
      || code === "http_rate_limited"
      || code === "http_fetch_failed"
      ? "warning"
      : "blocker",
  };
}

function isPendingBody(body: unknown): boolean {
  return isPlainRecord(body) && body.status === "pending";
}

function isMissingEvidenceMatch(match: ProviderHttpResponseMatchResult): boolean {
  return match.outcome === "manual_review"
    && match.positiveMatch === false
    && match.diagnosticCodes.includes("PROVIDER_MATCH_EVIDENCE_INVALID");
}

function retryPostureForDegradation(
  outcome: "blocked" | "manual_review" | "pending",
): ProviderHttpRetryPosture {
  return outcome === "pending" ? "not_retried" : "blocked";
}

function hasBoundedJsonStructure(value: unknown): boolean {
  const stack: Array<{ depth: number; value: unknown }> = [{ depth: 0, value }];
  const seen = new WeakSet<object>();
  let nodeCount = 0;

  try {
    while (stack.length > 0) {
      const current = stack.pop()!;
      nodeCount += 1;
      if (nodeCount > 4_096 || current.depth > 64) {
        return false;
      }
      if (typeof current.value !== "object" || current.value === null) {
        continue;
      }
      if (seen.has(current.value)) {
        return false;
      }
      seen.add(current.value);
      const children = Array.isArray(current.value)
        ? current.value
        : isPlainRecord(current.value)
          ? Object.values(current.value)
          : undefined;
      if (!children) {
        return false;
      }
      for (const child of children) {
        stack.push({ depth: current.depth + 1, value: child });
      }
    }
  } catch {
    return false;
  }

  return true;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function clonePlan(plan: ProviderHttpRequestPlan): ProviderHttpRequestPlan {
  return {
    ...plan,
    attempt: { ...plan.attempt },
    headerRefs: [...plan.headerRefs],
    operatorContextRefs: { ...plan.operatorContextRefs },
  };
}

function disabledDownstreamFlags(): ProviderHttpDownstreamLiveFlags {
  return {
    alternateQueuePublishing: false,
    analyticsIngestion: false,
    contractCalls: false,
    liveTelemetryExport: false,
    objectStorageWrites: false,
    renderedUiBehavior: false,
    rewardDistribution: false,
    schedulerExecution: false,
  };
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

function immutableReadonlySet(values: readonly string[]): ReadonlySet<string> {
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
