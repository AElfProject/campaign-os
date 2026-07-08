import { containsUnsafeProviderHttpRuntimeMaterial } from "./providerHttpRuntimeRedaction";
import type { ProviderHttpRequestPlan } from "./providerHttpRequestPlanner";
import type { ProviderHttpTransportResult } from "./providerHttpTransport";
import type { ProviderHttpDownstreamLiveFlags, ProviderHttpOutcome } from "./providerHttpRuntimeTypes";

export type ProviderHttpResponseDiagnosticCode =
  | "http_auth_or_config_failure"
  | "http_conflict"
  | "http_malformed_response"
  | "http_missing_evidence"
  | "http_non_retryable_failure"
  | "http_provider_unavailable"
  | "http_rate_limited"
  | "http_request_mapping_failure"
  | "http_timeout"
  | "http_unsafe_response_material"
  | "http_unsupported_response_mapping";
export type ProviderHttpRetryPosture = "blocked" | "exhausted" | "none" | "retry_scheduled";
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
  code: ProviderHttpResponseDiagnosticCode;
  field: string;
  message: string;
  redactedFields: string[];
  severity: "blocker" | "error" | "warning";
}

export interface ProviderHttpNormalizationPolicy {
  missingEvidenceOutcome?: "blocked" | "manual_review";
  notFoundOutcome?: "failed" | "manual_review";
  retryExhaustedOutcome?: "manual_review" | "disable_provider_task_templates";
  unsupportedMappingOutcome?: "blocked" | "manual_review";
}

export interface ProviderHttpNormalizedResult {
  degradationDecision: ProviderHttpDegradationDecision;
  diagnosticCodes: ProviderHttpResponseDiagnosticCode[];
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
  providerGroupId: string;
  requestPlanRedacted: ProviderHttpRequestPlan;
  retryPosture: ProviderHttpRetryPosture;
  taskId: string;
  traceId: string;
  transportDurationMs?: number;
  transportExecuted: boolean;
}

export const normalizeProviderHttpResponse = (
  plan: ProviderHttpRequestPlan,
  transportResult: ProviderHttpTransportResult,
  policy: ProviderHttpNormalizationPolicy = {},
): ProviderHttpNormalizedResult => {
  const diagnostics: ProviderHttpResponseDiagnostic[] = [];

  if (transportResult.timedOut || transportResult.aborted || transportResult.statusCode === 408) {
    return retryableResult(plan, transportResult, "http_timeout", "Provider HTTP request timed out.", policy);
  }

  if (containsUnsafeProviderHttpRuntimeMaterial(transportResult.body)) {
    diagnostics.push(
      diagnostic(
        "http_unsafe_response_material",
        "body",
        "Provider HTTP response contained unsafe material and was redacted.",
        ["body"],
      ),
    );
  }

  const statusCode = transportResult.statusCode;

  if (statusCode === undefined) {
    return createResult(plan, transportResult, {
      degradationDecision: "blocked",
      diagnostics: [
        ...diagnostics,
        diagnostic("http_malformed_response", "statusCode", "Provider HTTP response omitted status code."),
      ],
      outcome: "blocked",
      retryPosture: "blocked",
    });
  }

  if (diagnostics.length > 0) {
    return createResult(plan, transportResult, {
      degradationDecision: "manual_review",
      diagnostics,
      outcome: "manual_review",
      retryPosture: "blocked",
    });
  }

  if (statusCode === 202 || isPendingBody(transportResult.body)) {
    return createResult(plan, transportResult, {
      degradationDecision: "pending",
      diagnostics: [],
      outcome: "pending",
      retryPosture: "none",
    });
  }

  if (statusCode >= 200 && statusCode < 300) {
    return normalizeSuccessfulResponse(plan, transportResult, policy);
  }

  if (statusCode === 400) {
    return createResult(plan, transportResult, {
      degradationDecision: "blocked",
      diagnostics: [
        diagnostic("http_request_mapping_failure", "statusCode", "Provider HTTP request mapping failed."),
      ],
      outcome: "blocked",
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
      retryPosture: "blocked",
    });
  }

  if (statusCode === 429) {
    return retryableResult(plan, transportResult, "http_rate_limited", "Provider HTTP response was rate limited.", policy);
  }

  if (statusCode >= 500) {
    return retryableResult(
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
    retryPosture: "blocked",
  });
};

const normalizeSuccessfulResponse = (
  plan: ProviderHttpRequestPlan,
  transportResult: ProviderHttpTransportResult,
  policy: ProviderHttpNormalizationPolicy,
): ProviderHttpNormalizedResult => {
  if (!isSupportedResponseMapping(plan.responseMappingId)) {
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
      retryPosture: "blocked",
    });
  }

  if (!isCompatibleBody(transportResult.body)) {
    return createResult(plan, transportResult, {
      degradationDecision: "blocked",
      diagnostics: [
        diagnostic("http_malformed_response", "body", "Provider HTTP response body is malformed."),
      ],
      outcome: "blocked",
      retryPosture: "blocked",
    });
  }

  const evidenceHash = extractBodyString(transportResult.body, "evidenceHash") ?? plan.evidenceHash;
  const evidenceRef = extractBodyString(transportResult.body, "evidenceRef") ?? plan.evidenceRef;

  if (!evidenceHash || !evidenceRef) {
    const outcome = policy.missingEvidenceOutcome ?? "blocked";

    return createResult(plan, transportResult, {
      degradationDecision: outcome,
      diagnostics: [
        diagnostic("http_missing_evidence", "body", "Provider HTTP completed response omitted evidence hash/ref."),
      ],
      outcome,
      retryPosture: "blocked",
    });
  }

  return createResult(plan, transportResult, {
    degradationDecision: "pending",
    diagnostics: [],
    evidenceHash,
    evidenceRef,
    outcome: "completed",
    retryPosture: "none",
  });
};

const retryableResult = (
  plan: ProviderHttpRequestPlan,
  transportResult: ProviderHttpTransportResult,
  code: ProviderHttpResponseDiagnosticCode,
  message: string,
  policy: ProviderHttpNormalizationPolicy,
): ProviderHttpNormalizedResult => {
  const exhausted = plan.attempt.count >= plan.attempt.maxAttempts;
  const exhaustedOutcome = policy.retryExhaustedOutcome ?? "manual_review";

  return createResult(plan, transportResult, {
    degradationDecision: exhausted ? exhaustedOutcome : "pending",
    diagnostics: [diagnostic(code, "statusCode", message)],
    outcome: exhausted ? exhaustedOutcome : "pending",
    retryPosture: exhausted ? "exhausted" : "retry_scheduled",
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
    retryPosture: ProviderHttpRetryPosture;
  },
): ProviderHttpNormalizedResult => ({
  degradationDecision: input.degradationDecision,
  diagnosticCodes: input.diagnostics.map((item) => item.code),
  diagnostics: input.diagnostics,
  downstreamLiveFlags: {
    alternateQueuePublishing: false,
    analyticsIngestion: false,
    contractCalls: false,
    liveTelemetryExport: false,
    objectStorageWrites: false,
    renderedUiBehavior: false,
    rewardDistribution: false,
    schedulerExecution: false,
  },
  endpointId: plan.endpointId,
  evidenceHash: input.evidenceHash,
  evidenceRef: input.evidenceRef,
  httpStatusCode: transportResult.statusCode,
  idempotencyDecision: input.idempotencyDecision ?? "unique",
  leaseDecision: input.leaseDecision ?? "acquired",
  liveHttpCallsAttempted: true,
  outcome: input.outcome,
  providerGroupId: plan.providerGroupId,
  requestPlanRedacted: { ...plan, headerRefs: [...plan.headerRefs], operatorContextRefs: { ...plan.operatorContextRefs } },
  retryPosture: input.retryPosture,
  taskId: plan.taskId,
  traceId: plan.traceId,
  transportDurationMs: transportResult.durationMs,
  transportExecuted: true,
});

function diagnostic(
  code: ProviderHttpResponseDiagnosticCode,
  field: string,
  message: string,
  redactedFields: string[] = [],
): ProviderHttpResponseDiagnostic {
  return {
    code,
    field,
    message,
    redactedFields,
    severity: code === "http_provider_unavailable" || code === "http_rate_limited"
      ? "warning"
      : "blocker",
  };
}

function isSupportedResponseMapping(responseMappingId: string): boolean {
  return /^provider-http-response-map:(on-chain-indexer|dapp-api-status)-v1$/.test(responseMappingId);
}

function isPendingBody(body: unknown): boolean {
  return isRecord(body) && body.status === "pending";
}

function isCompatibleBody(body: unknown): boolean {
  return isRecord(body) && (body.status === undefined || typeof body.status === "string");
}

function extractBodyString(body: unknown, key: string): string | undefined {
  if (!isRecord(body)) {
    return undefined;
  }

  const value = body[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
