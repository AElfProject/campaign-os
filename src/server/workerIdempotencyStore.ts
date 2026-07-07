import type { BackendRuntimeProfileId } from "./backendProfiles";
import type { QueueDegradedOutcome } from "./queueRuntime";
import { workerIdempotencyPolicies, workerJobCatalog, workerSchedulerPolicies } from "./workerSchedulerRuntime";

export type WorkerIdempotencyStoreProfileId = BackendRuntimeProfileId;
export type WorkerIdempotencyStoreFoundationStatus = "local_ready" | "scaffolded" | "blocked";
export type WorkerIdempotencyStoreMode = "dry_run" | "metadata_only" | "production_required";
export type WorkerIdempotencyOperation =
  | "claim"
  | "complete"
  | "fail"
  | "release"
  | "conflict"
  | "replay"
  | "recover_stale"
  | "metrics";
export type WorkerIdempotencyDiagnosticSeverity = "error" | "warning" | "info";
export type WorkerIdempotencyDiagnosticCode =
  | "UNKNOWN_IDEMPOTENCY_PROFILE"
  | "IDEMPOTENCY_STORE_MISSING"
  | "IDEMPOTENCY_STORE_UNSUPPORTED"
  | "IDEMPOTENCY_STORE_ENDPOINT_MISSING"
  | "IDEMPOTENCY_STORE_CREDENTIALS_MISSING"
  | "IDEMPOTENCY_NAMESPACE_MISSING"
  | "IDEMPOTENCY_KEY_SCHEMA_VERSION_MISSING"
  | "IDEMPOTENCY_RETENTION_POLICY_MISSING"
  | "IDEMPOTENCY_CONFLICT_POLICY_MISSING"
  | "IDEMPOTENCY_COMPLETION_POLICY_MISSING"
  | "IDEMPOTENCY_CLOCK_MISSING"
  | "IDEMPOTENCY_WORKER_LEASE_COORDINATION_MISSING"
  | "IDEMPOTENCY_OBSERVABILITY_MISSING"
  | "UNKNOWN_WORKER_JOB"
  | "MISSING_TRACE_ID"
  | "MISSING_IDEMPOTENCY_KEY"
  | "UNSAFE_IDEMPOTENCY_KEY"
  | "UNKNOWN_SIDE_EFFECT_BOUNDARY"
  | "MISSING_SIDE_EFFECT_BOUNDARY"
  | "UNSAFE_WORKER_REFERENCE"
  | "UNSAFE_LEASE_KEY"
  | "MISSING_COMPLETION_EVIDENCE"
  | "UNSAFE_COMPLETION_EVIDENCE"
  | "INVALID_ATTEMPT"
  | "INVALID_IDEMPOTENCY_TIMESTAMP"
  | "UNSAFE_IDEMPOTENCY_CONFIG";
export type WorkerIdempotencyPreconditionArea =
  | "auth"
  | "clock"
  | "completion"
  | "conflict"
  | "idempotency"
  | "lease"
  | "namespace"
  | "observability"
  | "retention"
  | "schema";
export type IdempotencyDuplicateOutcome =
  | "blocked"
  | "drop_duplicate"
  | "manual_review"
  | "return_existing";
export type IdempotencyDegradedOutcome =
  | QueueDegradedOutcome
  | "return_existing"
  | "drop_duplicate"
  | "recover_stale";

export interface WorkerIdempotencyStoreNoLiveFlags {
  liveAiCallsEnabled: false;
  liveAnalyticsIngestionEnabled: false;
  liveContractCallsEnabled: false;
  liveCronExecutionEnabled: false;
  liveIdempotencyExecutionEnabled: false;
  liveObjectStorageEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueuePublishingEnabled: false;
  liveRewardDistributionEnabled: false;
  liveSchedulerExecutionEnabled: false;
  liveSocialCallsEnabled: false;
  liveWorkerExecutionEnabled: false;
}

export interface WorkerIdempotencyProductionPrecondition {
  area: WorkerIdempotencyPreconditionArea;
  diagnosticCode: WorkerIdempotencyDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface WorkerIdempotencyDiagnostic {
  code: WorkerIdempotencyDiagnosticCode;
  field: string;
  message: string;
  severity: WorkerIdempotencyDiagnosticSeverity;
}

export interface WorkerIdempotencyOperationCapability {
  degradedOutcome: IdempotencyDegradedOutcome;
  duplicateOutcome: IdempotencyDuplicateOutcome;
  liveEnabled: false;
  operation: WorkerIdempotencyOperation;
  operatorNextAction: string;
  requiredBeforeProduction: boolean;
  requiredConfigKeys: string[];
  supported: boolean;
}

export interface WorkerIdempotencyReadinessProjection {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: WorkerIdempotencyDiagnosticCode[];
  disabledLiveOperationCount: number;
  keySchemaVersion: string;
  liveIdempotencyExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: WorkerIdempotencyStoreMode;
  namespace: string;
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status: WorkerIdempotencyStoreFoundationStatus;
  storeId: string;
}

export interface WorkerIdempotencyStoreFoundationSummary {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: WorkerIdempotencyDiagnosticCode[];
  diagnostics: WorkerIdempotencyDiagnostic[];
  id: "campaign-os-worker-idempotency-store-foundation";
  keySchemaVersion: string;
  mode: WorkerIdempotencyStoreMode;
  namespace: string;
  noLiveFlags: WorkerIdempotencyStoreNoLiveFlags;
  operationCapabilities: WorkerIdempotencyOperationCapability[];
  preconditions: WorkerIdempotencyProductionPrecondition[];
  productionReady: false;
  profileId: WorkerIdempotencyStoreProfileId;
  readiness: WorkerIdempotencyReadinessProjection;
  status: WorkerIdempotencyStoreFoundationStatus;
  storeId: string;
  valid: boolean;
}

export interface CreateWorkerIdempotencyStoreFoundationOptions {
  env?: Record<string, unknown>;
  profileId?: string;
  storeId?: string;
}

export interface WorkerIdempotencyDryRunRequest {
  attempt: number;
  completionEvidenceReference?: string;
  idempotencyKeyReference: string;
  jobId: string;
  leaseKeyReference?: string;
  operation: WorkerIdempotencyOperation;
  requestedAt?: string;
  sideEffectBoundary: string;
  traceId: string;
  workerReference: string;
}

export interface WorkerIdempotencyDryRunResult {
  accepted: boolean;
  attempt?: number;
  completionEvidenceReference?: string;
  diagnosticCodes: WorkerIdempotencyDiagnosticCode[];
  diagnostics: WorkerIdempotencyDiagnostic[];
  idempotencyKeyReference?: string;
  jobId?: string;
  leaseKeyReference?: string;
  liveIdempotencyOperationAttempted: false;
  liveWorkerExecutionEnabled: false;
  operation?: WorkerIdempotencyOperation;
  productionWriteAttempted: false;
  requestedAt?: string;
  sideEffectBoundary?: string;
  status: "accepted_dry_run" | "rejected" | "duplicate_existing" | "conflict" | "stale_in_flight";
  traceId?: string;
  workerReference?: string;
}

const REDACTED_VALUE = "[redacted]";
const RAW_IDEMPOTENCY_PAYLOAD_VALUE = "[redacted-idempotency-payload]";
const FOUNDATION_ID = "campaign-os-worker-idempotency-store-foundation" as const;
const DEFAULT_NAMESPACE = "campaign-os-workers";
const DEFAULT_KEY_SCHEMA_VERSION = "v1";
const MAX_DRY_RUN_ATTEMPT = 10;

export const SUPPORTED_WORKER_IDEMPOTENCY_STORE_PROFILES: WorkerIdempotencyStoreProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const workerIdempotencyStoreNoLiveFlags: WorkerIdempotencyStoreNoLiveFlags = {
  liveAiCallsEnabled: false,
  liveAnalyticsIngestionEnabled: false,
  liveContractCallsEnabled: false,
  liveCronExecutionEnabled: false,
  liveIdempotencyExecutionEnabled: false,
  liveObjectStorageEnabled: false,
  liveProviderCallsEnabled: false,
  liveQueuePublishingEnabled: false,
  liveRewardDistributionEnabled: false,
  liveSchedulerExecutionEnabled: false,
  liveSocialCallsEnabled: false,
  liveWorkerExecutionEnabled: false,
};

export const workerIdempotencyStoreProductionPreconditions: WorkerIdempotencyProductionPrecondition[] = [
  {
    area: "idempotency",
    diagnosticCode: "IDEMPOTENCY_STORE_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_STORE",
    id: "idempotency-store-selection",
    message: "Idempotency store selection is required before live worker idempotency.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_STORE"],
    status: "blocked",
  },
  {
    area: "idempotency",
    diagnosticCode: "IDEMPOTENCY_STORE_ENDPOINT_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
    id: "idempotency-store-endpoint",
    message: "Idempotency store endpoint is required before live idempotency claims.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_STORE_URL"],
    status: "blocked",
  },
  {
    area: "auth",
    diagnosticCode: "IDEMPOTENCY_STORE_CREDENTIALS_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_STORE_CREDENTIALS",
    id: "idempotency-store-credentials",
    message: "Idempotency store credentials are required before live idempotency access.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_STORE_CREDENTIALS"],
    status: "blocked",
  },
  {
    area: "namespace",
    diagnosticCode: "IDEMPOTENCY_NAMESPACE_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_NAMESPACE",
    id: "idempotency-namespace",
    message: "Idempotency namespace is required before live worker idempotency.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_NAMESPACE"],
    status: "blocked",
  },
  {
    area: "schema",
    diagnosticCode: "IDEMPOTENCY_KEY_SCHEMA_VERSION_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_KEY_SCHEMA_VERSION",
    id: "idempotency-key-schema-version",
    message: "Idempotency key schema version is required before live idempotency.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_KEY_SCHEMA_VERSION"],
    status: "blocked",
  },
  {
    area: "retention",
    diagnosticCode: "IDEMPOTENCY_RETENTION_POLICY_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_RETENTION_DAYS",
    id: "idempotency-retention-policy",
    message: "Idempotency retention policy is required before duplicate replay handling.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_RETENTION_DAYS"],
    status: "blocked",
  },
  {
    area: "conflict",
    diagnosticCode: "IDEMPOTENCY_CONFLICT_POLICY_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_CONFLICT_POLICY",
    id: "idempotency-conflict-policy",
    message: "Idempotency conflict policy is required before duplicate side-effect handling.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_CONFLICT_POLICY"],
    status: "blocked",
  },
  {
    area: "completion",
    diagnosticCode: "IDEMPOTENCY_COMPLETION_POLICY_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_COMPLETION_POLICY",
    id: "idempotency-completion-policy",
    message: "Idempotency completion policy is required before returning completed job evidence.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_COMPLETION_POLICY"],
    status: "blocked",
  },
  {
    area: "clock",
    diagnosticCode: "IDEMPOTENCY_CLOCK_MISSING",
    field: "CAMPAIGN_OS_CLOCK_SOURCE",
    id: "idempotency-clock-source",
    message: "Clock source is required before stale in-flight idempotency recovery.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_CLOCK_SOURCE"],
    status: "blocked",
  },
  {
    area: "lease",
    diagnosticCode: "IDEMPOTENCY_WORKER_LEASE_COORDINATION_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
    id: "idempotency-worker-lease-coordination",
    message: "Worker lease coordination is required before concurrent live idempotency claims.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_STORE_URL"],
    status: "blocked",
  },
  {
    area: "observability",
    diagnosticCode: "IDEMPOTENCY_OBSERVABILITY_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
    id: "idempotency-observability",
    message: "Observability exporter is required before production idempotency visibility.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"],
    status: "deferred",
  },
];

export const workerIdempotencyOperationCapabilities: WorkerIdempotencyOperationCapability[] = [
  capability("claim", true, true, ["CAMPAIGN_OS_IDEMPOTENCY_STORE_URL"], "blocked", "pending"),
  capability("complete", true, true, ["CAMPAIGN_OS_IDEMPOTENCY_COMPLETION_POLICY"], "return_existing", "return_existing"),
  capability("fail", true, true, ["CAMPAIGN_OS_IDEMPOTENCY_COMPLETION_POLICY"], "manual_review", "manual_review"),
  capability("release", true, true, ["CAMPAIGN_OS_IDEMPOTENCY_CONFLICT_POLICY"], "drop_duplicate", "metadata_only"),
  capability("conflict", true, true, ["CAMPAIGN_OS_IDEMPOTENCY_CONFLICT_POLICY"], "manual_review", "blocked"),
  capability("replay", true, true, ["CAMPAIGN_OS_IDEMPOTENCY_RETENTION_DAYS"], "return_existing", "metadata_only"),
  capability("recover_stale", true, true, ["CAMPAIGN_OS_CLOCK_SOURCE"], "manual_review", "recover_stale"),
  capability("metrics", true, false, ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"], "drop_duplicate", "metadata_only"),
];

const workerJobById = new Map(workerJobCatalog.map((job) => [job.id, job]));
const idempotencyPolicyById = new Map(workerIdempotencyPolicies.map((policy) => [policy.id, policy]));
const idempotencyPolicyByJobId = new Map(
  workerSchedulerPolicies.map((policy) => [
    policy.jobId,
    idempotencyPolicyById.get(policy.idempotencyPolicyId),
  ]),
);

export const createWorkerIdempotencyStoreFoundation = (
  options: CreateWorkerIdempotencyStoreFoundationOptions = {},
): WorkerIdempotencyStoreFoundationSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const mode = resolveMode(profileResolution.profileId);
  const storeResolution = resolveStoreId(options.storeId, env, profileResolution.profileId);
  const namespaceResolution = resolveNamespace(env.CAMPAIGN_OS_IDEMPOTENCY_NAMESPACE);
  const keySchemaResolution = resolveKeySchemaVersion(env.CAMPAIGN_OS_IDEMPOTENCY_KEY_SCHEMA_VERSION);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...storeResolution.diagnostics,
    ...namespaceResolution.diagnostics,
    ...keySchemaResolution.diagnostics,
    ...productionDiagnostics,
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const storeId = storeResolution.storeId;
  const adapterId = `${storeId}-worker-idempotency-store-adapter`;
  const status = resolveStatus(profileResolution.profileId, blockerCount);
  const readiness = createReadinessProjection({
    adapterId,
    blockerCount,
    diagnostics,
    keySchemaVersion: keySchemaResolution.keySchemaVersion,
    mode,
    namespace: namespaceResolution.namespace,
    status,
    storeId,
  });

  return {
    adapterId,
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: FOUNDATION_ID,
    keySchemaVersion: keySchemaResolution.keySchemaVersion,
    mode,
    namespace: namespaceResolution.namespace,
    noLiveFlags: workerIdempotencyStoreNoLiveFlags,
    operationCapabilities: workerIdempotencyOperationCapabilities.map((item) => ({ ...item })),
    preconditions: workerIdempotencyStoreProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    readiness,
    status,
    storeId,
    valid: profileResolution.valid && storeResolution.valid && blockerCount === 0,
  };
};

export const evaluateWorkerIdempotencyDryRun = (
  request: WorkerIdempotencyDryRunRequest,
): WorkerIdempotencyDryRunResult => {
  const diagnostics = validateDryRunRequest(request);
  const accepted = diagnostics.length === 0;
  const redactedRequest = redactWorkerIdempotencyStoreValue(request) as WorkerIdempotencyDryRunRequest;
  const policy = idempotencyPolicyByJobId.get(request.jobId);

  return {
    accepted,
    attempt: accepted ? request.attempt : undefined,
    completionEvidenceReference: accepted ? redactedRequest.completionEvidenceReference : undefined,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    idempotencyKeyReference: accepted ? redactedRequest.idempotencyKeyReference : undefined,
    jobId: accepted ? request.jobId : undefined,
    leaseKeyReference: accepted ? redactedRequest.leaseKeyReference : undefined,
    liveIdempotencyOperationAttempted: false,
    liveWorkerExecutionEnabled: false,
    operation: accepted ? request.operation : undefined,
    productionWriteAttempted: false,
    requestedAt: accepted ? request.requestedAt : undefined,
    sideEffectBoundary: accepted ? request.sideEffectBoundary : undefined,
    status: accepted ? resolveAcceptedStatus(policy?.duplicateOutcome, request.operation) : "rejected",
    traceId: accepted ? request.traceId : undefined,
    workerReference: accepted ? redactedRequest.workerReference : undefined,
  };
};

export const redactWorkerIdempotencyStoreValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactWorkerIdempotencyStoreValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveIdempotencyKey(key) && !isSafeSerializableIdempotencyKey(key, nestedValue)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactWorkerIdempotencyStoreValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawIdempotencyPayload(value)) {
    return RAW_IDEMPOTENCY_PAYLOAD_VALUE;
  }

  if (isUnsafeIdempotencyString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function capability(
  operation: WorkerIdempotencyOperation,
  supported: boolean,
  requiredBeforeProduction: boolean,
  requiredConfigKeys: string[],
  duplicateOutcome: IdempotencyDuplicateOutcome,
  degradedOutcome: IdempotencyDegradedOutcome,
): WorkerIdempotencyOperationCapability {
  return {
    degradedOutcome,
    duplicateOutcome,
    liveEnabled: false,
    operation,
    operatorNextAction: operationNextAction(operation),
    requiredBeforeProduction,
    requiredConfigKeys,
    supported,
  };
}

function operationNextAction(operation: WorkerIdempotencyOperation): string {
  const labels: Record<WorkerIdempotencyOperation, string> = {
    claim: "Use dry-run idempotency claim metadata only; do not reserve live keys.",
    complete: "Record completion evidence references only; do not persist live completion state.",
    conflict: "Route duplicate conflict posture to manual review until durable store semantics are approved.",
    fail: "Expose failure posture only; do not write live failure records.",
    metrics: "Expose local metadata only until an observability exporter is configured.",
    recover_stale: "Keep stale in-flight recovery metadata-only until clock and lease coordination are live.",
    release: "Expose release posture only; do not release live idempotency claims.",
    replay: "Use replay metadata only; do not read or return live production records.",
  };

  return labels[operation];
}

const diagnostic = (
  code: WorkerIdempotencyDiagnosticCode,
  field: string,
  message: string,
  severity: WorkerIdempotencyDiagnosticSeverity = "error",
): WorkerIdempotencyDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const hasConfiguredValue = (env: Record<string, unknown>, keys: readonly string[]): boolean =>
  keys.every((key) => {
    const value = env[key];

    return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
  });

const createProductionDiagnostics = (
  env: Record<string, unknown>,
): WorkerIdempotencyDiagnostic[] =>
  workerIdempotencyStoreProductionPreconditions
    .filter((item) => !hasConfiguredValue(env, item.requiredConfigKeys))
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));

const isWorkerIdempotencyStoreProfileId = (value: string): value is WorkerIdempotencyStoreProfileId =>
  SUPPORTED_WORKER_IDEMPOTENCY_STORE_PROFILES.includes(value as WorkerIdempotencyStoreProfileId);

const resolveProfile = (
  requestedProfileId: string | undefined,
): { diagnostics: WorkerIdempotencyDiagnostic[]; profileId: WorkerIdempotencyStoreProfileId; valid: boolean } => {
  const profileId = requestedProfileId ?? "local-review";

  if (isWorkerIdempotencyStoreProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_IDEMPOTENCY_PROFILE",
        "profileId",
        `Unsupported worker idempotency store profile: ${sanitizeIdempotencyString(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
};

const resolveStoreId = (
  requestedStoreId: string | undefined,
  env: Record<string, unknown>,
  profileId: WorkerIdempotencyStoreProfileId,
): { diagnostics: WorkerIdempotencyDiagnostic[]; storeId: string; valid: boolean } => {
  const envStore = env.CAMPAIGN_OS_IDEMPOTENCY_STORE;
  const rawStoreId =
    requestedStoreId
    ?? (typeof envStore === "string" && envStore.trim().length > 0 ? envStore : undefined)
    ?? (profileId === "production-required" ? "missing-idempotency-store" : "local-dry-run");

  if (isUnsafeIdempotencyString(rawStoreId) || !isSafeStoreId(rawStoreId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_IDEMPOTENCY_CONFIG", "storeId", "Idempotency store id contains unsafe material."),
      ],
      storeId: "blocked-idempotency-store",
      valid: false,
    };
  }

  return {
    diagnostics: isSupportedStoreId(rawStoreId)
      ? []
      : [
        diagnostic(
          "IDEMPOTENCY_STORE_UNSUPPORTED",
          "storeId",
          `Idempotency store is not supported by this no-live foundation: ${sanitizeIdempotencyString(rawStoreId)}`,
        ),
      ],
    storeId: rawStoreId,
    valid: isSupportedStoreId(rawStoreId),
  };
};

const resolveMode = (profileId: WorkerIdempotencyStoreProfileId): WorkerIdempotencyStoreMode => {
  if (profileId === "local-review") {
    return "dry_run";
  }

  if (profileId === "staging-scaffold") {
    return "metadata_only";
  }

  return "production_required";
};

const resolveStatus = (
  profileId: WorkerIdempotencyStoreProfileId,
  blockerCount: number,
): WorkerIdempotencyStoreFoundationStatus => {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "local-review" ? "local_ready" : "scaffolded";
};

const createReadinessProjection = ({
  adapterId,
  blockerCount,
  diagnostics,
  keySchemaVersion,
  mode,
  namespace,
  status,
  storeId,
}: {
  adapterId: string;
  blockerCount: number;
  diagnostics: readonly WorkerIdempotencyDiagnostic[];
  keySchemaVersion: string;
  mode: WorkerIdempotencyStoreMode;
  namespace: string;
  status: WorkerIdempotencyStoreFoundationStatus;
  storeId: string;
}): WorkerIdempotencyReadinessProjection => ({
  adapterId,
  blockerCount,
  diagnosticCodes: diagnostics.map((item) => item.code),
  disabledLiveOperationCount: workerIdempotencyOperationCapabilities.filter((item) => item.liveEnabled === false).length,
  keySchemaVersion,
  liveIdempotencyExecutionEnabled: false,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode,
  namespace,
  operationCount: workerIdempotencyOperationCapabilities.length,
  productionReady: false,
  requiredConfigKeys: [
    ...new Set(workerIdempotencyStoreProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
  ],
  status,
  storeId,
});

const validateDryRunRequest = (
  request: WorkerIdempotencyDryRunRequest,
): WorkerIdempotencyDiagnostic[] => {
  const diagnostics: WorkerIdempotencyDiagnostic[] = [];
  const job = workerJobById.get(request.jobId);

  if (!job) {
    diagnostics.push(diagnostic("UNKNOWN_WORKER_JOB", "jobId", "Unknown worker job id."));
  }

  if (!request.traceId.trim()) {
    diagnostics.push(
      diagnostic("MISSING_TRACE_ID", "traceId", "Trace id is required for idempotency dry-run."),
    );
  }

  if (!request.idempotencyKeyReference.trim()) {
    diagnostics.push(
      diagnostic("MISSING_IDEMPOTENCY_KEY", "idempotencyKeyReference", "Idempotency key reference is required."),
    );
  } else if (!isSafeReference(request.idempotencyKeyReference) || isUnsafeIdempotencyString(request.idempotencyKeyReference)) {
    diagnostics.push(
      diagnostic("UNSAFE_IDEMPOTENCY_KEY", "idempotencyKeyReference", "Idempotency key reference is unsafe."),
    );
  }

  if (!request.sideEffectBoundary.trim()) {
    diagnostics.push(
      diagnostic("MISSING_SIDE_EFFECT_BOUNDARY", "sideEffectBoundary", "Side-effect boundary is required."),
    );
  } else if (!isKnownSideEffectBoundary(request.sideEffectBoundary, job?.sideEffectBoundary, request.jobId)) {
    diagnostics.push(
      diagnostic(
        "UNKNOWN_SIDE_EFFECT_BOUNDARY",
        "sideEffectBoundary",
        "Side-effect boundary is not part of the worker idempotency catalog.",
      ),
    );
  }

  if (!isSafeReference(request.workerReference) || isUnsafeIdempotencyString(request.workerReference)) {
    diagnostics.push(
      diagnostic("UNSAFE_WORKER_REFERENCE", "workerReference", "Worker reference contains unsafe material."),
    );
  }

  if (
    request.leaseKeyReference
    && (!isSafeReference(request.leaseKeyReference) || isUnsafeIdempotencyString(request.leaseKeyReference))
  ) {
    diagnostics.push(
      diagnostic("UNSAFE_LEASE_KEY", "leaseKeyReference", "Lease key reference is unsafe."),
    );
  }

  if (requiresCompletionEvidence(request.operation) && !request.completionEvidenceReference?.trim()) {
    diagnostics.push(
      diagnostic(
        "MISSING_COMPLETION_EVIDENCE",
        "completionEvidenceReference",
        "Completion evidence reference is required for completion dry-run.",
      ),
    );
  } else if (
    request.completionEvidenceReference
    && (!isSafeReference(request.completionEvidenceReference)
      || isUnsafeIdempotencyString(request.completionEvidenceReference))
  ) {
    diagnostics.push(
      diagnostic(
        "UNSAFE_COMPLETION_EVIDENCE",
        "completionEvidenceReference",
        "Completion evidence reference is unsafe.",
      ),
    );
  }

  if (!Number.isInteger(request.attempt) || request.attempt < 1 || request.attempt > MAX_DRY_RUN_ATTEMPT) {
    diagnostics.push(
      diagnostic("INVALID_ATTEMPT", "attempt", `Idempotency dry-run attempt must be 1-${MAX_DRY_RUN_ATTEMPT}.`),
    );
  }

  if (request.requestedAt && Number.isNaN(Date.parse(request.requestedAt))) {
    diagnostics.push(
      diagnostic("INVALID_IDEMPOTENCY_TIMESTAMP", "requestedAt", "Idempotency dry-run timestamp is invalid."),
    );
  }

  return diagnostics;
};

const resolveAcceptedStatus = (
  duplicateOutcome: IdempotencyDuplicateOutcome | undefined,
  operation: WorkerIdempotencyOperation,
): WorkerIdempotencyDryRunResult["status"] => {
  if (operation === "conflict") {
    return "conflict";
  }

  if (operation === "replay" && duplicateOutcome === "return_existing") {
    return "duplicate_existing";
  }

  if (operation === "recover_stale") {
    return "stale_in_flight";
  }

  return "accepted_dry_run";
};

const requiresCompletionEvidence = (operation: WorkerIdempotencyOperation): boolean =>
  operation === "complete";

const isKnownSideEffectBoundary = (
  requestedBoundary: string,
  schedulerBoundary: string | undefined,
  jobId: string,
): boolean => {
  const idempotencyPolicy = idempotencyPolicyByJobId.get(jobId);

  return (
  requestedBoundary === schedulerBoundary
  || requestedBoundary === idempotencyPolicy?.sideEffectBoundary
  );
};

const resolveNamespace = (
  value: unknown,
): { diagnostics: WorkerIdempotencyDiagnostic[]; namespace: string } => {
  const namespace = typeof value === "string" && value.trim().length > 0 ? value.trim() : DEFAULT_NAMESPACE;

  if (isSafeLabel(namespace) && !isUnsafeIdempotencyString(namespace)) {
    return {
      diagnostics: [],
      namespace,
    };
  }

  return {
    diagnostics: [
      diagnostic("UNSAFE_IDEMPOTENCY_CONFIG", "namespace", "Idempotency namespace contains unsafe material."),
    ],
    namespace: "blocked-idempotency-namespace",
  };
};

const resolveKeySchemaVersion = (
  value: unknown,
): { diagnostics: WorkerIdempotencyDiagnostic[]; keySchemaVersion: string } => {
  const keySchemaVersion =
    typeof value === "string" && value.trim().length > 0 ? value.trim() : DEFAULT_KEY_SCHEMA_VERSION;

  if (isSafeSchemaVersion(keySchemaVersion) && !isUnsafeIdempotencyString(keySchemaVersion)) {
    return {
      diagnostics: [],
      keySchemaVersion,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNSAFE_IDEMPOTENCY_CONFIG",
        "keySchemaVersion",
        "Idempotency key schema version contains unsafe material.",
      ),
    ],
    keySchemaVersion: "blocked-idempotency-schema-version",
  };
};

const sanitizeIdempotencyString = (value: string): string => {
  const redacted = redactWorkerIdempotencyStoreValue(value);

  return typeof redacted === "string" ? redacted : REDACTED_VALUE;
};

const isSupportedStoreId = (value: string): boolean =>
  value === "local-dry-run" || value === "metadata-only" || value === "production-idempotency-store";

const isSafeStoreId = (value: string): boolean =>
  /^[a-z][a-z0-9-]{2,63}$/i.test(value);

const isSafeLabel = (value: string): boolean =>
  /^[a-z][a-z0-9-]{1,63}$/i.test(value);

const isSafeSchemaVersion = (value: string): boolean =>
  /^v[0-9]+(?:-[a-z0-9-]+)?$/i.test(value);

const isSafeReference = (value: string): boolean =>
  /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)*$/i.test(value);

const isSafeSerializableIdempotencyKey = (key: string, value: unknown): boolean =>
  /^(completionEvidenceReference|idempotencyKeyReference|leaseKeyReference|workerReference)$/i.test(key)
  && typeof value === "string"
  && isSafeReference(value)
  && !isUnsafeIdempotencyString(value);

const isSensitiveIdempotencyKey = (key: string): boolean =>
  /api[-_]?key|bearer|contract[-_]?payload|credential|evidence[-_]?payload|idempotency[-_]?(key|token)|job[-_]?payload|lease[-_]?(key|token)|lock[-_]?key|object[-_]?key|payload|private[-_]?key|provider[-_]?payload|queue[-_]?payload|reward[-_]?payload|secret|signed[-_]?url|token|webhook|wallet|worker[-_]?payload/i.test(
    key,
  );

const isUnsafeIdempotencyString = (value: string): boolean =>
  isCredentialedUrl(value)
  || isLikelyObjectKey(value)
  || isSensitiveIdempotencyString(value)
  || isWalletAddressString(value)
  || isRawIdempotencyPayload(value);

const isSensitiveIdempotencyString = (value: string): boolean =>
  /(api[-_]?key|bearer\s+|hook-secret|idempotency-token|lock-key|private[-_]?key|queue-secret|secret|token=|worker-token|x-amz-signature=|signed-url)/i.test(
    value,
  );

const isCredentialedUrl = (value: string): boolean => {
  try {
    const url = new URL(value);

    return Boolean(url.username || url.password || url.searchParams.size > 0);
  } catch {
    return false;
  }
};

const isLikelyObjectKey = (value: string): boolean =>
  /^[a-z0-9][a-z0-9-_]*\/.+\.(csv|json|jsonl|parquet|zip)$/i.test(value)
  || /(^|\/)(exports?|evidence|attachments?|idempotency-locks?|lease-locks?|queue-payloads?)\/.+\.(csv|json|jsonl|parquet|zip)$/i.test(value);

const isWalletAddressString = (value: string): boolean =>
  /ELF_[A-Za-z0-9_]+|wallet[-_]?address/i.test(value);

const isRawIdempotencyPayload = (value: string): boolean => {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  return /address|claim|contract|evidence|job|payload|provider|queue|reward|task|wallet|worker/i.test(trimmed);
};
