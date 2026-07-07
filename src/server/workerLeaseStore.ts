import type { BackendRuntimeProfileId } from "./backendProfiles";
import type { QueueDegradedOutcome } from "./queueRuntime";
import { workerJobCatalog } from "./workerSchedulerRuntime";

export type WorkerLeaseStoreProfileId = BackendRuntimeProfileId;
export type WorkerLeaseStoreFoundationStatus = "local_ready" | "scaffolded" | "blocked";
export type WorkerLeaseStoreMode = "dry_run" | "metadata_only" | "production_required";
export type WorkerLeaseOperation =
  | "claim"
  | "heartbeat"
  | "release"
  | "expire"
  | "recover_stale"
  | "reject_conflict"
  | "fence"
  | "metrics";
export type WorkerLeaseDiagnosticSeverity = "error" | "warning" | "info";
export type WorkerLeaseDiagnosticCode =
  | "UNKNOWN_WORKER_LEASE_PROFILE"
  | "WORKER_LEASE_STORE_MISSING"
  | "WORKER_LEASE_STORE_UNSUPPORTED"
  | "WORKER_LEASE_ENDPOINT_MISSING"
  | "WORKER_LEASE_CREDENTIALS_MISSING"
  | "WORKER_LEASE_CLOCK_MISSING"
  | "WORKER_LEASE_HEARTBEAT_POLICY_MISSING"
  | "WORKER_LEASE_TTL_POLICY_MISSING"
  | "WORKER_LEASE_RELEASE_POLICY_MISSING"
  | "WORKER_LEASE_STALE_RECOVERY_MISSING"
  | "WORKER_LEASE_FENCING_POLICY_MISSING"
  | "WORKER_LEASE_IDEMPOTENCY_COORDINATION_MISSING"
  | "WORKER_LEASE_OBSERVABILITY_MISSING"
  | "UNKNOWN_WORKER_JOB"
  | "MISSING_TRACE_ID"
  | "UNSAFE_WORKER_REFERENCE"
  | "UNSAFE_LEASE_KEY"
  | "UNSAFE_FENCING_TOKEN"
  | "INVALID_LEASE_TIMING"
  | "UNSAFE_WORKER_LEASE_CONFIG";
export type WorkerLeasePreconditionArea =
  | "auth"
  | "clock"
  | "expiry"
  | "fencing"
  | "heartbeat"
  | "idempotency"
  | "lease"
  | "observability";
export type WorkerLeaseDegradedOutcome =
  | QueueDegradedOutcome
  | "disable_worker_templates";

export interface WorkerLeaseStoreNoLiveFlags {
  liveAiCallsEnabled: false;
  liveAnalyticsIngestionEnabled: false;
  liveContractCallsEnabled: false;
  liveCronExecutionEnabled: false;
  liveObjectStorageEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueuePublishingEnabled: false;
  liveRewardDistributionEnabled: false;
  liveSchedulerExecutionEnabled: false;
  liveSocialCallsEnabled: false;
  liveWorkerExecutionEnabled: false;
}

export interface WorkerLeaseProductionPrecondition {
  area: WorkerLeasePreconditionArea;
  diagnosticCode: WorkerLeaseDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface WorkerLeaseDiagnostic {
  code: WorkerLeaseDiagnosticCode;
  field: string;
  message: string;
  severity: WorkerLeaseDiagnosticSeverity;
}

export interface WorkerLeaseOperationCapability {
  degradedOutcome: WorkerLeaseDegradedOutcome;
  liveEnabled: false;
  operation: WorkerLeaseOperation;
  operatorNextAction: string;
  requiredBeforeProduction: boolean;
  requiredConfigKeys: string[];
  supported: boolean;
}

export interface WorkerLeaseStoreReadinessProjection {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: WorkerLeaseDiagnosticCode[];
  disabledLiveOperationCount: number;
  heartbeatIntervalSeconds: number;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: WorkerLeaseStoreMode;
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  storeId: string;
  ttlSeconds: number;
}

export interface WorkerLeaseStoreFoundationSummary {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: WorkerLeaseDiagnosticCode[];
  diagnostics: WorkerLeaseDiagnostic[];
  id: "campaign-os-worker-lease-store-foundation";
  mode: WorkerLeaseStoreMode;
  noLiveFlags: WorkerLeaseStoreNoLiveFlags;
  operationCapabilities: WorkerLeaseOperationCapability[];
  preconditions: WorkerLeaseProductionPrecondition[];
  productionReady: false;
  profileId: WorkerLeaseStoreProfileId;
  readiness: WorkerLeaseStoreReadinessProjection;
  status: WorkerLeaseStoreFoundationStatus;
  storeId: string;
  valid: boolean;
}

export interface CreateWorkerLeaseStoreFoundationOptions {
  env?: Record<string, unknown>;
  profileId?: string;
  storeId?: string;
}

export interface WorkerLeaseDryRunRequest {
  fencingTokenReference?: string;
  heartbeatIntervalSeconds: number;
  jobId: string;
  leaseKeyReference: string;
  operation: WorkerLeaseOperation;
  requestedAt?: string;
  traceId: string;
  ttlSeconds: number;
  workerReference: string;
}

export interface WorkerLeaseDryRunResult {
  accepted: boolean;
  diagnosticCodes: WorkerLeaseDiagnosticCode[];
  diagnostics: WorkerLeaseDiagnostic[];
  fencingTokenReference?: string;
  heartbeatIntervalSeconds?: number;
  jobId?: string;
  leaseKeyReference?: string;
  liveLeaseOperationAttempted: false;
  liveWorkerExecutionEnabled: false;
  operation?: WorkerLeaseOperation;
  requestedAt?: string;
  status: "accepted_dry_run" | "rejected";
  traceId?: string;
  ttlSeconds?: number;
  workerReference?: string;
}

const REDACTED_VALUE = "[redacted]";
const RAW_LEASE_PAYLOAD_VALUE = "[redacted-lease-payload]";
const FOUNDATION_ID = "campaign-os-worker-lease-store-foundation" as const;
const DEFAULT_TTL_SECONDS = 120;
const DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 30;

export const SUPPORTED_WORKER_LEASE_STORE_PROFILES: WorkerLeaseStoreProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const workerLeaseStoreNoLiveFlags: WorkerLeaseStoreNoLiveFlags = {
  liveAiCallsEnabled: false,
  liveAnalyticsIngestionEnabled: false,
  liveContractCallsEnabled: false,
  liveCronExecutionEnabled: false,
  liveObjectStorageEnabled: false,
  liveProviderCallsEnabled: false,
  liveQueuePublishingEnabled: false,
  liveRewardDistributionEnabled: false,
  liveSchedulerExecutionEnabled: false,
  liveSocialCallsEnabled: false,
  liveWorkerExecutionEnabled: false,
};

export const workerLeaseStoreProductionPreconditions: WorkerLeaseProductionPrecondition[] = [
  {
    area: "lease",
    diagnosticCode: "WORKER_LEASE_STORE_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_STORE",
    id: "worker-lease-store-selection",
    message: "Worker lease store selection is required before live worker execution.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_STORE"],
    status: "blocked",
  },
  {
    area: "lease",
    diagnosticCode: "WORKER_LEASE_ENDPOINT_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
    id: "worker-lease-store-endpoint",
    message: "Worker lease store endpoint is required before live worker leasing.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_STORE_URL"],
    status: "blocked",
  },
  {
    area: "auth",
    diagnosticCode: "WORKER_LEASE_CREDENTIALS_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS",
    id: "worker-lease-store-credentials",
    message: "Worker lease credentials are required before live lease store access.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_CREDENTIALS"],
    status: "blocked",
  },
  {
    area: "clock",
    diagnosticCode: "WORKER_LEASE_CLOCK_MISSING",
    field: "CAMPAIGN_OS_CLOCK_SOURCE",
    id: "worker-lease-clock-source",
    message: "Clock source is required before lease expiry and heartbeat evaluation.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_CLOCK_SOURCE"],
    status: "blocked",
  },
  {
    area: "heartbeat",
    diagnosticCode: "WORKER_LEASE_HEARTBEAT_POLICY_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS",
    id: "worker-lease-heartbeat-policy",
    message: "Heartbeat policy is required before live lease renewal.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS"],
    status: "blocked",
  },
  {
    area: "expiry",
    diagnosticCode: "WORKER_LEASE_TTL_POLICY_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS",
    id: "worker-lease-ttl-policy",
    message: "Lease TTL policy is required before live lease expiry handling.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS"],
    status: "blocked",
  },
  {
    area: "lease",
    diagnosticCode: "WORKER_LEASE_RELEASE_POLICY_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY",
    id: "worker-lease-release-policy",
    message: "Release policy is required before live worker lease release.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY"],
    status: "blocked",
  },
  {
    area: "expiry",
    diagnosticCode: "WORKER_LEASE_STALE_RECOVERY_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY",
    id: "worker-lease-stale-recovery",
    message: "Stale lease recovery policy is required before live worker crash recovery.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY"],
    status: "blocked",
  },
  {
    area: "fencing",
    diagnosticCode: "WORKER_LEASE_FENCING_POLICY_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY",
    id: "worker-lease-fencing-policy",
    message: "Fencing token policy is required before live duplicate worker protection.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY"],
    status: "blocked",
  },
  {
    area: "idempotency",
    diagnosticCode: "WORKER_LEASE_IDEMPOTENCY_COORDINATION_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
    id: "worker-lease-idempotency-coordination",
    message: "Idempotency coordination is required before side-effecting live workers execute.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_STORE_URL"],
    status: "blocked",
  },
  {
    area: "observability",
    diagnosticCode: "WORKER_LEASE_OBSERVABILITY_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
    id: "worker-lease-observability",
    message: "Observability exporter is required before production worker lease visibility.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"],
    status: "deferred",
  },
];

export const workerLeaseOperationCapabilities: WorkerLeaseOperationCapability[] = [
  capability("claim", true, true, ["CAMPAIGN_OS_WORKER_LEASE_STORE_URL"], "pending"),
  capability("heartbeat", true, true, ["CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS"], "metadata_only"),
  capability("release", true, true, ["CAMPAIGN_OS_WORKER_LEASE_RELEASE_POLICY"], "metadata_only"),
  capability("expire", true, true, ["CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS"], "manual_review"),
  capability("recover_stale", true, true, ["CAMPAIGN_OS_WORKER_LEASE_STALE_RECOVERY_POLICY"], "manual_review"),
  capability("reject_conflict", true, true, ["CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY"], "blocked"),
  capability("fence", true, true, ["CAMPAIGN_OS_WORKER_LEASE_FENCING_POLICY"], "blocked"),
  capability("metrics", true, false, ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"], "metadata_only"),
];

export const createWorkerLeaseStoreFoundation = (
  options: CreateWorkerLeaseStoreFoundationOptions = {},
): WorkerLeaseStoreFoundationSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const mode = resolveMode(profileResolution.profileId);
  const storeResolution = resolveStoreId(options.storeId, env, profileResolution.profileId);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...storeResolution.diagnostics,
    ...productionDiagnostics,
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const storeId = storeResolution.storeId;
  const adapterId = `${storeId}-worker-lease-store-adapter`;
  const readiness = createReadinessProjection({
    adapterId,
    blockerCount,
    diagnostics,
    env,
    mode,
    storeId,
  });

  return {
    adapterId,
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: FOUNDATION_ID,
    mode,
    noLiveFlags: workerLeaseStoreNoLiveFlags,
    operationCapabilities: workerLeaseOperationCapabilities.map((item) => ({ ...item })),
    preconditions: workerLeaseStoreProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    readiness,
    status: resolveStatus(profileResolution.profileId, blockerCount),
    storeId,
    valid: profileResolution.valid && storeResolution.valid && blockerCount === 0,
  };
};

export const evaluateWorkerLeaseDryRun = (
  request: WorkerLeaseDryRunRequest,
): WorkerLeaseDryRunResult => {
  const diagnostics: WorkerLeaseDiagnostic[] = [];

  if (!workerJobCatalog.some((job) => job.id === request.jobId)) {
    diagnostics.push(diagnostic("UNKNOWN_WORKER_JOB", "jobId", "Unknown worker job id."));
  }

  if (!request.traceId.trim()) {
    diagnostics.push(diagnostic("MISSING_TRACE_ID", "traceId", "Trace id is required for lease dry-run."));
  }

  if (isUnsafeLeaseString(request.workerReference) || !isSafeReference(request.workerReference)) {
    diagnostics.push(
      diagnostic("UNSAFE_WORKER_REFERENCE", "workerReference", "Worker reference contains unsafe material."),
    );
  }

  if (isUnsafeLeaseString(request.leaseKeyReference) || !isSafeReference(request.leaseKeyReference)) {
    diagnostics.push(diagnostic("UNSAFE_LEASE_KEY", "leaseKeyReference", "Lease key reference is unsafe."));
  }

  if (
    request.fencingTokenReference
    && (isUnsafeLeaseString(request.fencingTokenReference) || !isSafeReference(request.fencingTokenReference))
  ) {
    diagnostics.push(
      diagnostic("UNSAFE_FENCING_TOKEN", "fencingTokenReference", "Fencing token reference is unsafe."),
    );
  }

  if (!isValidLeaseTiming(request)) {
    diagnostics.push(diagnostic("INVALID_LEASE_TIMING", "timing", "Lease TTL, heartbeat, or timestamp is invalid."));
  }

  const accepted = diagnostics.length === 0;
  const redactedRequest = redactWorkerLeaseStoreValue(request) as WorkerLeaseDryRunRequest;

  return {
    accepted,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    fencingTokenReference: accepted ? redactedRequest.fencingTokenReference : undefined,
    heartbeatIntervalSeconds: accepted ? request.heartbeatIntervalSeconds : undefined,
    jobId: accepted ? request.jobId : undefined,
    leaseKeyReference: accepted ? redactedRequest.leaseKeyReference : undefined,
    liveLeaseOperationAttempted: false,
    liveWorkerExecutionEnabled: false,
    operation: accepted ? request.operation : undefined,
    requestedAt: accepted ? request.requestedAt : undefined,
    status: accepted ? "accepted_dry_run" : "rejected",
    traceId: accepted ? request.traceId : undefined,
    ttlSeconds: accepted ? request.ttlSeconds : undefined,
    workerReference: accepted ? redactedRequest.workerReference : undefined,
  };
};

export const redactWorkerLeaseStoreValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactWorkerLeaseStoreValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveLeaseKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactWorkerLeaseStoreValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawLeasePayload(value)) {
    return RAW_LEASE_PAYLOAD_VALUE;
  }

  if (isUnsafeLeaseString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function capability(
  operation: WorkerLeaseOperation,
  supported: boolean,
  requiredBeforeProduction: boolean,
  requiredConfigKeys: string[],
  degradedOutcome: WorkerLeaseDegradedOutcome,
): WorkerLeaseOperationCapability {
  return {
    degradedOutcome,
    liveEnabled: false,
    operation,
    operatorNextAction: operationNextAction(operation),
    requiredBeforeProduction,
    requiredConfigKeys,
    supported,
  };
}

function operationNextAction(operation: WorkerLeaseOperation): string {
  const labels: Record<WorkerLeaseOperation, string> = {
    claim: "Use dry-run lease metadata only; do not claim live worker leases.",
    expire: "Keep lease expiry under manual review until live stale recovery is approved.",
    fence: "Keep fencing blocked until a lease store and idempotency store are configured.",
    heartbeat: "Expose heartbeat policy metadata only; do not renew live leases.",
    metrics: "Expose local metadata only until an observability exporter is configured.",
    recover_stale: "Route stale lease recovery to manual review until crash recovery is approved.",
    reject_conflict: "Keep conflict rejection blocked until fencing semantics are approved.",
    release: "Expose release policy metadata only; do not release live leases.",
  };

  return labels[operation];
}

const diagnostic = (
  code: WorkerLeaseDiagnosticCode,
  field: string,
  message: string,
  severity: WorkerLeaseDiagnosticSeverity = "error",
): WorkerLeaseDiagnostic => ({
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
): WorkerLeaseDiagnostic[] =>
  workerLeaseStoreProductionPreconditions
    .filter((item) => !hasConfiguredValue(env, item.requiredConfigKeys))
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));

const isWorkerLeaseStoreProfileId = (value: string): value is WorkerLeaseStoreProfileId =>
  SUPPORTED_WORKER_LEASE_STORE_PROFILES.includes(value as WorkerLeaseStoreProfileId);

const resolveProfile = (
  requestedProfileId: string | undefined,
): { diagnostics: WorkerLeaseDiagnostic[]; profileId: WorkerLeaseStoreProfileId; valid: boolean } => {
  const profileId = requestedProfileId ?? "local-review";

  if (isWorkerLeaseStoreProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_WORKER_LEASE_PROFILE",
        "profileId",
        `Unsupported worker lease store profile: ${sanitizeLeaseString(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
};

const resolveStoreId = (
  requestedStoreId: string | undefined,
  env: Record<string, unknown>,
  profileId: WorkerLeaseStoreProfileId,
): { diagnostics: WorkerLeaseDiagnostic[]; storeId: string; valid: boolean } => {
  const envStore = env.CAMPAIGN_OS_WORKER_LEASE_STORE;
  const rawStoreId =
    requestedStoreId
    ?? (typeof envStore === "string" && envStore.trim().length > 0 ? envStore : undefined)
    ?? (profileId === "production-required" ? "missing-lease-store" : "local-dry-run");

  if (isUnsafeLeaseString(rawStoreId) || !isSafeStoreId(rawStoreId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_WORKER_LEASE_CONFIG", "storeId", "Worker lease store id contains unsafe material."),
      ],
      storeId: "blocked-lease-store",
      valid: false,
    };
  }

  return {
    diagnostics: isSupportedStoreId(rawStoreId)
      ? []
      : [
        diagnostic(
          "WORKER_LEASE_STORE_UNSUPPORTED",
          "storeId",
          `Worker lease store is not supported by this no-live foundation: ${sanitizeLeaseString(rawStoreId)}`,
        ),
      ],
    storeId: rawStoreId,
    valid: isSupportedStoreId(rawStoreId),
  };
};

const resolveMode = (profileId: WorkerLeaseStoreProfileId): WorkerLeaseStoreMode => {
  if (profileId === "local-review") {
    return "dry_run";
  }

  if (profileId === "staging-scaffold") {
    return "metadata_only";
  }

  return "production_required";
};

const resolveStatus = (
  profileId: WorkerLeaseStoreProfileId,
  blockerCount: number,
): WorkerLeaseStoreFoundationStatus => {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "local-review" ? "local_ready" : "scaffolded";
};

const createReadinessProjection = ({
  adapterId,
  blockerCount,
  diagnostics,
  env,
  mode,
  storeId,
}: {
  adapterId: string;
  blockerCount: number;
  diagnostics: readonly WorkerLeaseDiagnostic[];
  env: Record<string, unknown>;
  mode: WorkerLeaseStoreMode;
  storeId: string;
}): WorkerLeaseStoreReadinessProjection => ({
  adapterId,
  blockerCount,
  diagnosticCodes: diagnostics.map((item) => item.code),
  disabledLiveOperationCount: workerLeaseOperationCapabilities.filter((item) => item.liveEnabled === false).length,
  heartbeatIntervalSeconds: readPositiveInteger(env.CAMPAIGN_OS_WORKER_LEASE_HEARTBEAT_SECONDS)
    ?? DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode,
  operationCount: workerLeaseOperationCapabilities.length,
  productionReady: false,
  requiredConfigKeys: [
    ...new Set(workerLeaseStoreProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
  ],
  storeId,
  ttlSeconds: readPositiveInteger(env.CAMPAIGN_OS_WORKER_LEASE_TTL_SECONDS) ?? DEFAULT_TTL_SECONDS,
});

const isValidLeaseTiming = (request: WorkerLeaseDryRunRequest): boolean => {
  if (
    !Number.isFinite(request.ttlSeconds)
    || !Number.isFinite(request.heartbeatIntervalSeconds)
    || request.ttlSeconds <= 0
    || request.heartbeatIntervalSeconds <= 0
    || request.ttlSeconds <= request.heartbeatIntervalSeconds
  ) {
    return false;
  }

  if (!request.requestedAt) {
    return true;
  }

  return !Number.isNaN(Date.parse(request.requestedAt));
};

const readPositiveInteger = (value: unknown): number | undefined => {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : undefined;
};

const sanitizeLeaseString = (value: string): string => {
  const redacted = redactWorkerLeaseStoreValue(value);

  return typeof redacted === "string" ? redacted : REDACTED_VALUE;
};

const isSupportedStoreId = (value: string): boolean =>
  value === "local-dry-run" || value === "metadata-only" || value === "production-lease-store";

const isSafeStoreId = (value: string): boolean =>
  /^[a-z][a-z0-9-]{2,63}$/i.test(value);

const isSafeReference = (value: string): boolean =>
  /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)*$/i.test(value);

const isSensitiveLeaseKey = (key: string): boolean =>
  /api[-_]?key|bearer|credential|fencing[-_]?token|job[-_]?payload|lease[-_]?(key|token)|lock[-_]?key|object[-_]?key|payload|private[-_]?key|provider[-_]?payload|queue[-_]?payload|secret|signed[-_]?url|token|webhook|wallet|worker[-_]?payload/i.test(
    key,
  );

const isUnsafeLeaseString = (value: string): boolean =>
  isCredentialedUrl(value)
  || isLikelyObjectKey(value)
  || isSensitiveLeaseString(value)
  || isWalletAddressString(value)
  || isRawLeasePayload(value);

const isSensitiveLeaseString = (value: string): boolean =>
  /(api[-_]?key|bearer\s+|hook-secret|lease-token|lock-key|private[-_]?key|queue-secret|secret|token=|worker-token|x-amz-signature=|signed-url)/i.test(
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
  || /(^|\/)(exports?|evidence|attachments?|lease-locks?|queue-payloads?)\/.+\.(csv|json|jsonl|parquet|zip)$/i.test(value);

const isWalletAddressString = (value: string): boolean =>
  /ELF_[A-Za-z0-9_]+|wallet[-_]?address/i.test(value);

const isRawLeasePayload = (value: string): boolean => {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  return /address|job|lease|payload|provider|queue|task|wallet|worker/i.test(trimmed);
};
