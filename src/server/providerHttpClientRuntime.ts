import { createProviderHttpRuntimeSummary } from "./providerHttpRuntimeRegistry";
import type { ProviderHttpRequestPlannerDiagnostic, ProviderHttpVerificationRequestInput } from "./providerHttpRequestPlanner";
import { planProviderHttpRequest } from "./providerHttpRequestPlanner";
import type { ProviderHttpTransport, ProviderHttpTransportDiagnostic } from "./providerHttpTransport";
import { executeProviderHttpTransport } from "./providerHttpTransport";
import type {
  ProviderHttpIdempotencyDecision,
  ProviderHttpLeaseDecision,
  ProviderHttpNormalizationPolicy,
  ProviderHttpNormalizedResult,
} from "./providerHttpResponseNormalizer";
import { normalizeProviderHttpResponse } from "./providerHttpResponseNormalizer";
import type { ProviderHttpDownstreamLiveFlags, ProviderHttpRuntimeSummary } from "./providerHttpRuntimeTypes";

export type ProviderHttpRuntimeDiagnostic =
  | ProviderHttpRequestPlannerDiagnostic
  | ProviderHttpTransportDiagnostic
  | {
    code: "duplicate_idempotency" | "lease_conflict";
    field: string;
    message: string;
    redactedFields: string[];
    severity: "blocker";
  };

export interface ProviderHttpExecutionGuard {
  decision: ProviderHttpIdempotencyDecision;
  evidenceHash?: string;
  evidenceRef?: string;
}

export interface ProviderHttpLeaseGuard {
  decision: ProviderHttpLeaseDecision;
}

export interface ExecuteProviderHttpRequestOptions {
  idempotency?: ProviderHttpExecutionGuard;
  lease?: ProviderHttpLeaseGuard;
  normalizationPolicy?: ProviderHttpNormalizationPolicy;
  runtime?: ProviderHttpRuntimeSummary;
  transport?: ProviderHttpTransport;
}

export type ProviderHttpRuntimeResult = ProviderHttpNormalizedResult | ProviderHttpBlockedResult;

export interface ProviderHttpBlockedResult {
  degradationDecision: "blocked" | "manual_review";
  diagnosticCodes: string[];
  diagnostics: ProviderHttpRuntimeDiagnostic[];
  downstreamLiveFlags: ProviderHttpDownstreamLiveFlags;
  evidenceHash?: string;
  evidenceRef?: string;
  idempotencyDecision: ProviderHttpIdempotencyDecision;
  leaseDecision: ProviderHttpLeaseDecision;
  liveHttpCallsAttempted: false;
  outcome: "blocked" | "manual_review" | "completed";
  retryPosture: "blocked" | "none";
  taskId?: string;
  traceId?: string;
  transportExecuted: false;
}

export const executeProviderHttpRequest = async (
  input: ProviderHttpVerificationRequestInput,
  options: ExecuteProviderHttpRequestOptions = {},
): Promise<ProviderHttpRuntimeResult> => {
  const runtime = options.runtime ?? createProviderHttpRuntimeSummary({ profileId: "local-review" });

  if (options.idempotency && options.idempotency.decision !== "unique") {
    return createIdempotencyResult(input, runtime, options.idempotency);
  }

  if (options.lease && options.lease.decision !== "acquired") {
    return createLeaseResult(input, runtime, options.lease);
  }

  const planResult = planProviderHttpRequest(input, runtime);

  if (!planResult.ok) {
    return createBlockedResult(input, runtime, {
      diagnostics: planResult.diagnostics,
      idempotencyDecision: "unique",
      leaseDecision: "acquired",
    });
  }

  const transportResult = await executeProviderHttpTransport(planResult.plan, options.transport);

  if (!transportResult.ok) {
    return createBlockedResult(input, runtime, {
      diagnostics: transportResult.diagnostics,
      idempotencyDecision: "unique",
      leaseDecision: "acquired",
    });
  }

  return normalizeProviderHttpResponse(
    planResult.plan,
    transportResult.result,
    options.normalizationPolicy,
  );
};

function createIdempotencyResult(
  input: ProviderHttpVerificationRequestInput,
  runtime: ProviderHttpRuntimeSummary,
  idempotency: ProviderHttpExecutionGuard,
): ProviderHttpBlockedResult {
  if (idempotency.decision === "existing_completion") {
    return createBlockedResult(input, runtime, {
      diagnostics: [],
      evidenceHash: idempotency.evidenceHash,
      evidenceRef: idempotency.evidenceRef,
      idempotencyDecision: "existing_completion",
      leaseDecision: "acquired",
      outcome: idempotency.evidenceHash && idempotency.evidenceRef ? "completed" : "manual_review",
      retryPosture: "none",
    });
  }

  return createBlockedResult(input, runtime, {
    diagnostics: [
      {
        code: "duplicate_idempotency",
        field: "idempotencyRef",
        message: "Provider HTTP idempotency guard blocked duplicate execution.",
        redactedFields: ["idempotencyRef"],
        severity: "blocker",
      },
    ],
    idempotencyDecision: idempotency.decision,
    leaseDecision: "acquired",
  });
}

function createLeaseResult(
  input: ProviderHttpVerificationRequestInput,
  runtime: ProviderHttpRuntimeSummary,
  lease: ProviderHttpLeaseGuard,
): ProviderHttpBlockedResult {
  return createBlockedResult(input, runtime, {
    diagnostics: [
      {
        code: "lease_conflict",
        field: "leaseRef",
        message: "Provider HTTP lease guard blocked execution.",
        redactedFields: ["leaseRef"],
        severity: "blocker",
      },
    ],
    idempotencyDecision: "unique",
    leaseDecision: lease.decision,
    outcome: lease.decision === "manual_review" ? "manual_review" : "blocked",
  });
}

function createBlockedResult(
  input: ProviderHttpVerificationRequestInput,
  runtime: ProviderHttpRuntimeSummary,
  state: {
    degradationDecision?: "blocked" | "manual_review";
    diagnostics: ProviderHttpRuntimeDiagnostic[];
    evidenceHash?: string;
    evidenceRef?: string;
    idempotencyDecision: ProviderHttpIdempotencyDecision;
    leaseDecision: ProviderHttpLeaseDecision;
    outcome?: "blocked" | "manual_review" | "completed";
    retryPosture?: "blocked" | "none";
  },
): ProviderHttpBlockedResult {
  const outcome = state.outcome ?? "blocked";

  return {
    degradationDecision: state.degradationDecision ?? (outcome === "manual_review" ? "manual_review" : "blocked"),
    diagnosticCodes: state.diagnostics.map((diagnostic) => diagnostic.code),
    diagnostics: state.diagnostics,
    downstreamLiveFlags: { ...runtime.downstreamLiveFlags },
    evidenceHash: state.evidenceHash,
    evidenceRef: state.evidenceRef,
    idempotencyDecision: state.idempotencyDecision,
    leaseDecision: state.leaseDecision,
    liveHttpCallsAttempted: false,
    outcome,
    retryPosture: state.retryPosture ?? (outcome === "completed" ? "none" : "blocked"),
    taskId: input.taskId,
    traceId: input.traceId,
    transportExecuted: false,
  };
}
