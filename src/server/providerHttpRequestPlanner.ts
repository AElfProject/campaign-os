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
  | "invalid_attempt"
  | "missing_campaign_id"
  | "missing_idempotency_ref"
  | "missing_lease_ref"
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
  operatorContextRefs?: Record<string, string>;
  providerGroupId?: string;
  taskId?: string;
  traceId?: string;
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
  method: ProviderHttpMethod;
  operatorContextRefs: Record<string, string>;
  providerGroupId: string;
  requestMappingId: string;
  responseMappingId: string;
  retryPolicyRef: string;
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
  "operatorContextRefs",
  "providerGroupId",
  "taskId",
  "traceId",
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

  return {
    diagnostics: [],
    ok: true,
    plan: {
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
      method: endpoint.method,
      operatorContextRefs: { ...(input.operatorContextRefs ?? {}) },
      providerGroupId: endpoint.providerGroupId,
      requestMappingId: endpoint.requestMappingId,
      responseMappingId: endpoint.responseMappingId,
      retryPolicyRef: endpoint.retryPolicyRef,
      taskId: input.taskId!,
      timeoutMs: parseTimeoutMs(endpoint.timeoutPolicyRef),
      timeoutPolicyRef: endpoint.timeoutPolicyRef,
      traceId: input.traceId!,
      urlRef: endpoint.urlTemplateRef,
      verificationType: input.verificationType!,
      walletAccountRef: sanitizeOptionalRef(input.walletAccountRef),
      walletSessionRef: sanitizeOptionalRef(input.walletSessionRef),
    },
  };
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

const detectUnsafeRequestMaterial = (
  input: ProviderHttpVerificationRequestInput,
): ProviderHttpRequestPlannerDiagnostic[] => {
  const unsafeFields = new Set<string>();

  Object.entries(input).forEach(([key, value]) => {
    if (!allowedRequestKeys.has(key) && isUnsafeRequestKey(key)) {
      unsafeFields.add(key);
      return;
    }

    if (!allowedRequestKeys.has(key) && containsUnsafeProviderHttpRuntimeMaterial(value)) {
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

const containsUnsafeSafeFieldValue = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === "object" && !(value instanceof Error)) {
    return containsUnsafeProviderHttpRuntimeMaterial(value);
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
