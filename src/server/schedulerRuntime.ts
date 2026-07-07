import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  queueRuntimePlans,
  type QueueDegradedOutcome,
  type QueuePlan,
} from "./queueRuntime";
import {
  workerIdempotencyPolicies,
  workerJobCatalog,
  workerRetryBackoffPolicies,
  workerSchedulerPolicies,
  type WorkerJobDefinition,
  type WorkerJobFamily,
  type WorkerTriggerSource,
} from "./workerSchedulerRuntime";

export type SchedulerRuntimeProfileId = BackendRuntimeProfileId;
export type SchedulerRuntimeFoundationStatus = "local_ready" | "scaffolded" | "blocked";
export type SchedulerRuntimeDiagnosticSeverity = "error" | "warning" | "info";
export type SchedulerRuntimeDiagnosticCode =
  | "UNKNOWN_SCHEDULER_RUNTIME_PROFILE"
  | "SCHEDULER_PROVIDER_MISSING"
  | "SCHEDULER_ENDPOINT_MISSING"
  | "SCHEDULER_CLOCK_LEASE_MISSING"
  | "SCHEDULER_IDEMPOTENCY_STORE_MISSING"
  | "SCHEDULER_QUEUE_HANDOFF_MISSING"
  | "SCHEDULER_OBSERVABILITY_MISSING"
  | "SCHEDULER_OPERATOR_AUTHORIZATION_MISSING"
  | "SCHEDULER_DEAD_LETTER_MISSING"
  | "UNKNOWN_SCHEDULE_ID"
  | "UNKNOWN_SCHEDULE_JOB"
  | "MISMATCHED_SCHEDULE_JOB"
  | "MISMATCHED_TRIGGER_SOURCE"
  | "MISSING_TRACE_ID"
  | "INVALID_TIME_WINDOW"
  | "UNSAFE_OPERATOR_OVERRIDE_REASON"
  | "MISSING_IDEMPOTENCY_KEY"
  | "UNSAFE_IDEMPOTENCY_KEY"
  | "MISSING_QUEUE_HANDOFF_REFERENCE"
  | "UNSAFE_QUEUE_HANDOFF_REFERENCE"
  | "LIVE_SCHEDULER_EXECUTION_DISABLED"
  | "UNKNOWN_RETRY_POLICY"
  | "UNKNOWN_IDEMPOTENCY_POLICY"
  | "UNKNOWN_QUEUE_HANDOFF";
export type SchedulerRuntimePreconditionArea =
  | "auth"
  | "clock"
  | "dead_letter"
  | "idempotency"
  | "observability"
  | "queue"
  | "scheduler";
export type SchedulerTriggerResultStatus = "accepted_dry_run" | "rejected";

export interface SchedulerRuntimeNoLiveFlags {
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

export interface SchedulerRuntimeProductionPrecondition {
  area: SchedulerRuntimePreconditionArea;
  diagnosticCode: SchedulerRuntimeDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface SchedulerRuntimeDiagnostic {
  code: SchedulerRuntimeDiagnosticCode;
  field: string;
  message: string;
  severity: SchedulerRuntimeDiagnosticSeverity;
}

export interface SchedulerQueueHandoffSummary {
  degradedOutcome: QueueDegradedOutcome;
  liveQueuePublishingEnabled: false;
  operatorNextAction: string;
  payloadReferencePolicy: string;
  queueId: string;
  queuePlanId: string;
  queueRuntimeId: "campaign-os-queue-runtime-foundation";
}

export interface SchedulerOperatorOverridePosture {
  allowed: boolean;
  authorizationDependencyId: "operator-authorization";
  manualReviewRequired: boolean;
  requiredReasonPattern: "operator-review-reference";
  unsafeReasonOutcome: "rejected";
}

export interface SchedulerRuntimeRegistration {
  cadence: string;
  concurrencyLimit: number;
  deadlineSeconds: number;
  id: string;
  idempotencyPolicyId: string;
  jobFamily: WorkerJobFamily;
  jobId: string;
  jobLabel: string;
  liveCronExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveSchedulerExecutionEnabled: false;
  operatorOverride: SchedulerOperatorOverridePosture;
  queueHandoff: SchedulerQueueHandoffSummary;
  retryPolicyId: string;
  scheduleId: string;
  sideEffectBoundary: string;
  triggerSource: WorkerTriggerSource;
}

export interface SchedulerTriggerRequest {
  idempotencyKey: string;
  jobId: string;
  operatorOverrideReason?: string;
  queueHandoffReference: string;
  scheduleId: string;
  scheduledFor: string;
  traceId: string;
  triggerSource: WorkerTriggerSource;
  windowEnd: string;
  windowStart: string;
}

export interface SchedulerTriggerResult {
  accepted: boolean;
  degradedOutcome: QueueDegradedOutcome;
  diagnosticCodes: SchedulerRuntimeDiagnosticCode[];
  diagnostics: SchedulerRuntimeDiagnostic[];
  idempotencyKey?: string;
  jobId?: string;
  liveCronExecutionEnabled: false;
  liveExecutionAttempted: false;
  liveQueuePublishingEnabled: false;
  liveSchedulerExecutionEnabled: false;
  operatorOverrideReason?: string;
  queueHandoffReference?: string;
  scheduleId?: string;
  scheduledFor?: string;
  status: SchedulerTriggerResultStatus;
  traceId?: string;
  triggerSource?: WorkerTriggerSource;
  windowEnd?: string;
  windowStart?: string;
}

export interface SchedulerRuntimeReadinessProjection {
  blockerCount: number;
  diagnosticCodes: SchedulerRuntimeDiagnosticCode[];
  dryRunTriggerEnabled: boolean;
  liveCronExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveSchedulerExecutionEnabled: false;
  productionReady: false;
  registrationCount: number;
  requiredConfigKeys: string[];
  scheduleIds: string[];
  triggerSourceCount: number;
}

export interface SchedulerRuntimeFoundationSummary {
  blockerCount: number;
  diagnosticCodes: SchedulerRuntimeDiagnosticCode[];
  diagnostics: SchedulerRuntimeDiagnostic[];
  id: "campaign-os-scheduler-runtime-foundation";
  noLiveFlags: SchedulerRuntimeNoLiveFlags;
  preconditions: SchedulerRuntimeProductionPrecondition[];
  productionReady: false;
  profileId: SchedulerRuntimeProfileId;
  readiness: SchedulerRuntimeReadinessProjection;
  registrations: SchedulerRuntimeRegistration[];
  status: SchedulerRuntimeFoundationStatus;
  valid: boolean;
}

export interface CreateSchedulerRuntimeFoundationOptions {
  env?: Record<string, unknown>;
  profileId?: string;
}

const REDACTED_VALUE = "[redacted]";
const RAW_TRIGGER_PAYLOAD_VALUE = "[redacted-trigger-payload]";
const SCHEDULER_RUNTIME_ID = "campaign-os-scheduler-runtime-foundation" as const;
const QUEUE_RUNTIME_ID = "campaign-os-queue-runtime-foundation" as const;

const manualReviewJobFamilies = new Set<WorkerJobFamily>([
  "campaign_lifecycle",
  "export_preparation",
  "stale_review_cleanup",
  "contract_sync_handoff",
  "reward_distribution_handoff",
]);

export const SUPPORTED_SCHEDULER_RUNTIME_PROFILES: SchedulerRuntimeProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const schedulerRuntimeNoLiveFlags: SchedulerRuntimeNoLiveFlags = {
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

export const schedulerRuntimeProductionPreconditions: SchedulerRuntimeProductionPrecondition[] = [
  {
    area: "scheduler",
    diagnosticCode: "SCHEDULER_PROVIDER_MISSING",
    field: "CAMPAIGN_OS_SCHEDULER_PROVIDER",
    id: "scheduler-provider",
    message: "Scheduler provider selection is required before live schedule registration.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_SCHEDULER_PROVIDER"],
    status: "blocked",
  },
  {
    area: "scheduler",
    diagnosticCode: "SCHEDULER_ENDPOINT_MISSING",
    field: "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
    id: "scheduler-endpoint",
    message: "Scheduler endpoint is required before live scheduler execution.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_SCHEDULER_ENDPOINT"],
    status: "blocked",
  },
  {
    area: "clock",
    diagnosticCode: "SCHEDULER_CLOCK_LEASE_MISSING",
    field: "CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL",
    id: "scheduler-clock-lease",
    message: "Clock and lease storage are required before concurrent live scheduler execution.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_SCHEDULER_LEASE_STORE_URL"],
    status: "blocked",
  },
  {
    area: "idempotency",
    diagnosticCode: "SCHEDULER_IDEMPOTENCY_STORE_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
    id: "scheduler-idempotency-store",
    message: "Idempotency store is required before scheduler triggers can hand off side-effecting work.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_STORE_URL"],
    status: "blocked",
  },
  {
    area: "queue",
    diagnosticCode: "SCHEDULER_QUEUE_HANDOFF_MISSING",
    field: "CAMPAIGN_OS_WORKER_QUEUE_URL",
    id: "scheduler-queue-handoff",
    message: "Worker queue handoff must be configured before live scheduler triggers can enqueue work.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_QUEUE_URL"],
    status: "blocked",
  },
  {
    area: "observability",
    diagnosticCode: "SCHEDULER_OBSERVABILITY_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
    id: "scheduler-observability",
    message: "Observability exporter is required before production scheduler visibility.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"],
    status: "deferred",
  },
  {
    area: "auth",
    diagnosticCode: "SCHEDULER_OPERATOR_AUTHORIZATION_MISSING",
    field: "CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY",
    id: "scheduler-operator-authorization",
    message: "Operator authorization policy is required before operator-triggered schedules run.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OPERATOR_AUTHORIZATION_POLICY"],
    status: "blocked",
  },
  {
    area: "dead_letter",
    diagnosticCode: "SCHEDULER_DEAD_LETTER_MISSING",
    field: "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
    id: "scheduler-dead-letter",
    message: "Degradation and dead-letter handling is required before live scheduler retry failures.",
    requiredBeforeProduction: true,
    requiredConfigKeys: [
      "CAMPAIGN_OS_DEGRADATION_POLICY",
      "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
    ],
    status: "blocked",
  },
];

const queuePlanByJobId = new Map(queueRuntimePlans.map((plan) => [plan.jobId, plan]));
const workerJobById = new Map(workerJobCatalog.map((job) => [job.id, job]));
const retryPolicyIds = new Set(workerRetryBackoffPolicies.map((policy) => policy.id));
const idempotencyPolicyIds = new Set(workerIdempotencyPolicies.map((policy) => policy.id));

const registration = (
  policy: (typeof workerSchedulerPolicies)[number],
): SchedulerRuntimeRegistration => {
  const job = workerJobById.get(policy.jobId);
  const queuePlan = queuePlanByJobId.get(policy.jobId);

  return {
    cadence: policy.cadence,
    concurrencyLimit: policy.concurrencyLimit,
    deadlineSeconds: policy.deadlineSeconds,
    id: `${policy.id}-registration`,
    idempotencyPolicyId: policy.idempotencyPolicyId,
    jobFamily: job?.family ?? "task_verification",
    jobId: policy.jobId,
    jobLabel: job?.label ?? "Unknown scheduler job",
    liveCronExecutionEnabled: false,
    liveQueuePublishingEnabled: false,
    liveSchedulerExecutionEnabled: false,
    operatorOverride: createOperatorOverride(job, policy.manualOverrideAllowed),
    queueHandoff: createQueueHandoff(queuePlan, policy.jobId),
    retryPolicyId: policy.retryPolicyId,
    scheduleId: policy.id,
    sideEffectBoundary: job?.sideEffectBoundary ?? "unknown-scheduler-side-effect-boundary",
    triggerSource: policy.triggerSource,
  };
};

export const schedulerRuntimeRegistrations: SchedulerRuntimeRegistration[] =
  workerSchedulerPolicies.map(registration);

const registrationByScheduleId = new Map(
  schedulerRuntimeRegistrations.map((item) => [item.scheduleId, item]),
);

const diagnostic = (
  code: SchedulerRuntimeDiagnosticCode,
  field: string,
  message: string,
  severity: SchedulerRuntimeDiagnosticSeverity = "error",
): SchedulerRuntimeDiagnostic => ({
  code,
  field,
  message,
  severity,
});

export const createSchedulerRuntimeFoundation = (
  options: CreateSchedulerRuntimeFoundationOptions = {},
): SchedulerRuntimeFoundationSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const registryDiagnostics = createRegistryDiagnostics();
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...registryDiagnostics,
    ...productionDiagnostics,
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const status = resolveStatus(profileResolution.profileId, blockerCount);
  const readiness = createReadinessProjection(diagnostics, blockerCount);

  return {
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: SCHEDULER_RUNTIME_ID,
    noLiveFlags: schedulerRuntimeNoLiveFlags,
    preconditions: schedulerRuntimeProductionPreconditions.map((item) => ({
      ...item,
      requiredConfigKeys: [...item.requiredConfigKeys],
    })),
    productionReady: false,
    profileId: profileResolution.profileId,
    readiness,
    registrations: schedulerRuntimeRegistrations.map(cloneRegistration),
    status,
    valid: profileResolution.valid && blockerCount === 0,
  };
};

export const dryRunSchedulerTrigger = (
  request: SchedulerTriggerRequest,
): SchedulerTriggerResult => {
  const registration = registrationByScheduleId.get(request.scheduleId);
  const diagnostics = validateTriggerRequest(request, registration);
  const accepted = diagnostics.length === 0;

  return {
    accepted,
    degradedOutcome: registration?.queueHandoff.degradedOutcome ?? "blocked",
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    idempotencyKey: sanitizeSchedulerRuntimeString(request.idempotencyKey),
    jobId: sanitizeSchedulerRuntimeString(request.jobId),
    liveCronExecutionEnabled: false,
    liveExecutionAttempted: false,
    liveQueuePublishingEnabled: false,
    liveSchedulerExecutionEnabled: false,
    operatorOverrideReason: request.operatorOverrideReason
      ? sanitizeSchedulerRuntimeString(request.operatorOverrideReason)
      : undefined,
    queueHandoffReference: sanitizeSchedulerRuntimeString(request.queueHandoffReference),
    scheduleId: sanitizeSchedulerRuntimeString(request.scheduleId),
    scheduledFor: sanitizeSchedulerRuntimeString(request.scheduledFor),
    status: accepted ? "accepted_dry_run" : "rejected",
    traceId: sanitizeSchedulerRuntimeString(request.traceId),
    triggerSource: request.triggerSource,
    windowEnd: sanitizeSchedulerRuntimeString(request.windowEnd),
    windowStart: sanitizeSchedulerRuntimeString(request.windowStart),
  };
};

export const redactSchedulerRuntimeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactSchedulerRuntimeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveSchedulerRuntimeKey(key) && !isSafeSerializableSchedulerKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactSchedulerRuntimeValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawTriggerPayload(value)) {
    return RAW_TRIGGER_PAYLOAD_VALUE;
  }

  if (isUnsafeSchedulerRuntimeString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function createQueueHandoff(
  queuePlan: QueuePlan | undefined,
  jobId: string,
): SchedulerQueueHandoffSummary {
  return {
    degradedOutcome: queuePlan?.degradedOutcome ?? "blocked",
    liveQueuePublishingEnabled: false,
    operatorNextAction: queuePlan?.operatorNextAction ?? "Block scheduler trigger until queue handoff policy exists.",
    payloadReferencePolicy: queuePlan?.payloadReferencePolicy ?? "payload-reference-or-hash-only-no-raw-payload",
    queueId: queuePlan?.queueId ?? "missing-queue-handoff",
    queuePlanId: queuePlan?.id ?? `${jobId}-missing-queue-plan`,
    queueRuntimeId: QUEUE_RUNTIME_ID,
  };
}

function createOperatorOverride(
  job: WorkerJobDefinition | undefined,
  allowed: boolean,
): SchedulerOperatorOverridePosture {
  return {
    allowed,
    authorizationDependencyId: "operator-authorization",
    manualReviewRequired: job ? manualReviewJobFamilies.has(job.family) : true,
    requiredReasonPattern: "operator-review-reference",
    unsafeReasonOutcome: "rejected",
  };
}

const cloneRegistration = (
  item: SchedulerRuntimeRegistration,
): SchedulerRuntimeRegistration => ({
  ...item,
  operatorOverride: { ...item.operatorOverride },
  queueHandoff: { ...item.queueHandoff },
});

const isSchedulerRuntimeProfileId = (value: string): value is SchedulerRuntimeProfileId =>
  SUPPORTED_SCHEDULER_RUNTIME_PROFILES.includes(value as SchedulerRuntimeProfileId);

const resolveProfile = (
  requestedProfileId: string | undefined,
): { diagnostics: SchedulerRuntimeDiagnostic[]; profileId: SchedulerRuntimeProfileId; valid: boolean } => {
  const profileId = requestedProfileId ?? "local-review";

  if (isSchedulerRuntimeProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_SCHEDULER_RUNTIME_PROFILE",
        "profileId",
        `Unsupported scheduler runtime profile: ${sanitizeSchedulerRuntimeString(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
};

const createProductionDiagnostics = (
  env: Record<string, unknown>,
): SchedulerRuntimeDiagnostic[] =>
  schedulerRuntimeProductionPreconditions
    .filter((item) => !hasConfiguredValue(env, item.requiredConfigKeys))
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));

const createRegistryDiagnostics = (): SchedulerRuntimeDiagnostic[] =>
  schedulerRuntimeRegistrations.flatMap((item) => {
    const diagnostics: SchedulerRuntimeDiagnostic[] = [];

    if (!workerJobById.has(item.jobId)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_SCHEDULE_JOB",
          "jobId",
          `Unknown scheduler job id: ${sanitizeSchedulerRuntimeString(item.jobId)}`,
        ),
      );
    }

    if (!retryPolicyIds.has(item.retryPolicyId)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_RETRY_POLICY",
          "retryPolicyId",
          `Unknown scheduler retry policy id: ${sanitizeSchedulerRuntimeString(item.retryPolicyId)}`,
        ),
      );
    }

    if (!idempotencyPolicyIds.has(item.idempotencyPolicyId)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_IDEMPOTENCY_POLICY",
          "idempotencyPolicyId",
          `Unknown scheduler idempotency policy id: ${sanitizeSchedulerRuntimeString(item.idempotencyPolicyId)}`,
        ),
      );
    }

    if (!queuePlanByJobId.has(item.jobId)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_QUEUE_HANDOFF",
          "queueHandoff",
          `Unknown queue handoff for scheduler job id: ${sanitizeSchedulerRuntimeString(item.jobId)}`,
        ),
      );
    }

    return diagnostics;
  });

const validateTriggerRequest = (
  request: SchedulerTriggerRequest,
  registration: SchedulerRuntimeRegistration | undefined,
): SchedulerRuntimeDiagnostic[] => {
  const diagnostics: SchedulerRuntimeDiagnostic[] = [];

  if (!registration) {
    diagnostics.push(
      diagnostic(
        "UNKNOWN_SCHEDULE_ID",
        "scheduleId",
        `Unknown scheduler schedule id: ${sanitizeSchedulerRuntimeString(request.scheduleId)}`,
      ),
    );
  }

  if (!workerJobById.has(request.jobId)) {
    diagnostics.push(
      diagnostic(
        "UNKNOWN_SCHEDULE_JOB",
        "jobId",
        `Unknown scheduler job id: ${sanitizeSchedulerRuntimeString(request.jobId)}`,
      ),
    );
  }

  if (registration && request.jobId !== registration.jobId) {
    diagnostics.push(
      diagnostic(
        "MISMATCHED_SCHEDULE_JOB",
        "jobId",
        `Job id ${sanitizeSchedulerRuntimeString(request.jobId)} does not match schedule ${registration.scheduleId}.`,
      ),
    );
  }

  if (registration && request.triggerSource !== registration.triggerSource) {
    diagnostics.push(
      diagnostic(
        "MISMATCHED_TRIGGER_SOURCE",
        "triggerSource",
        `Trigger source ${request.triggerSource} does not match schedule ${registration.scheduleId}.`,
      ),
    );
  }

  if (!request.traceId.trim()) {
    diagnostics.push(diagnostic("MISSING_TRACE_ID", "traceId", "Trace id is required for scheduler dry-run."));
  }

  if (!isValidTimeWindow(request.scheduledFor, request.windowStart, request.windowEnd)) {
    diagnostics.push(
      diagnostic("INVALID_TIME_WINDOW", "window", "Scheduler dry-run requires valid scheduled/window timestamps."),
    );
  }

  if (!request.idempotencyKey.trim()) {
    diagnostics.push(
      diagnostic("MISSING_IDEMPOTENCY_KEY", "idempotencyKey", "Idempotency key is required for scheduler dry-run."),
    );
  } else if (isUnsafeSchedulerRuntimeString(request.idempotencyKey)) {
    diagnostics.push(
      diagnostic("UNSAFE_IDEMPOTENCY_KEY", "idempotencyKey", "Idempotency key contains unsafe scheduler material."),
    );
  }

  if (!request.queueHandoffReference.trim()) {
    diagnostics.push(
      diagnostic(
        "MISSING_QUEUE_HANDOFF_REFERENCE",
        "queueHandoffReference",
        "Queue handoff reference is required for scheduler dry-run.",
      ),
    );
  } else if (isUnsafeSchedulerRuntimeString(request.queueHandoffReference)) {
    diagnostics.push(
      diagnostic(
        "UNSAFE_QUEUE_HANDOFF_REFERENCE",
        "queueHandoffReference",
        "Queue handoff reference must be a safe id/hash reference.",
      ),
    );
  }

  if (
    request.operatorOverrideReason
    && isUnsafeSchedulerRuntimeString(request.operatorOverrideReason)
  ) {
    diagnostics.push(
      diagnostic(
        "UNSAFE_OPERATOR_OVERRIDE_REASON",
        "operatorOverrideReason",
        "Operator override reason must be a safe operator review reference.",
      ),
    );
  }

  if (requestsLiveExecution(request)) {
    diagnostics.push(
      diagnostic(
        "LIVE_SCHEDULER_EXECUTION_DISABLED",
        "liveExecution",
        "Live scheduler, cron, and queue execution are disabled for scheduler dry-run.",
      ),
    );
  }

  return diagnostics;
};

const createReadinessProjection = (
  diagnostics: readonly SchedulerRuntimeDiagnostic[],
  blockerCount: number,
): SchedulerRuntimeReadinessProjection => ({
  blockerCount,
  diagnosticCodes: diagnostics.map((item) => item.code),
  dryRunTriggerEnabled: blockerCount === 0,
  liveCronExecutionEnabled: false,
  liveQueuePublishingEnabled: false,
  liveSchedulerExecutionEnabled: false,
  productionReady: false,
  registrationCount: schedulerRuntimeRegistrations.length,
  requiredConfigKeys: [
    ...new Set(schedulerRuntimeProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
  ],
  scheduleIds: schedulerRuntimeRegistrations.map((item) => item.scheduleId),
  triggerSourceCount: new Set(schedulerRuntimeRegistrations.map((item) => item.triggerSource)).size,
});

const resolveStatus = (
  profileId: SchedulerRuntimeProfileId,
  blockerCount: number,
): SchedulerRuntimeFoundationStatus => {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "staging-scaffold" ? "scaffolded" : "local_ready";
};

const hasConfiguredValue = (env: Record<string, unknown>, keys: readonly string[]): boolean =>
  keys.every((key) => {
    const value = env[key];

    return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
  });

const sanitizeSchedulerRuntimeString = (value: string): string => {
  const redacted = redactSchedulerRuntimeValue(value);

  return typeof redacted === "string" ? redacted : REDACTED_VALUE;
};

const isValidTimeWindow = (
  scheduledForValue: string,
  windowStartValue: string,
  windowEndValue: string,
): boolean => {
  const scheduledFor = Date.parse(scheduledForValue);
  const windowStart = Date.parse(windowStartValue);
  const windowEnd = Date.parse(windowEndValue);

  return Number.isFinite(scheduledFor)
    && Number.isFinite(windowStart)
    && Number.isFinite(windowEnd)
    && windowEnd > windowStart
    && scheduledFor >= windowStart
    && scheduledFor <= windowEnd;
};

const requestsLiveExecution = (request: SchedulerTriggerRequest): boolean => {
  const dynamicRequest = request as SchedulerTriggerRequest & Record<string, unknown>;

  return dynamicRequest.liveSchedulerExecutionEnabled === true
    || dynamicRequest.liveCronExecutionEnabled === true
    || dynamicRequest.liveQueuePublishingEnabled === true
    || dynamicRequest.liveWorkerExecutionEnabled === true
    || dynamicRequest.liveExecutionAttempted === true;
};

const isSafeSerializableSchedulerKey = (key: string): boolean =>
  /^(idempotencyKey|jobId|operatorOverrideReason|queueHandoffReference|scheduleId|scheduledFor|traceId|triggerSource|windowEnd|windowStart)$/i.test(
    key,
  );

const isSensitiveSchedulerRuntimeKey = (key: string): boolean =>
  /bearer|credential|lease[-_]?token|object[-_]?key|operator[-_]?free[-_]?text|provider[-_]?payload|queue[-_]?handoff|queue[-_]?url|scheduler[-_]?endpoint|secret|signed[-_]?url|token|trigger[-_]?payload|webhook[-_]?secret|wallet[-_]?address/i.test(
    key,
  );

const isUnsafeSchedulerRuntimeString = (value: string): boolean =>
  isCredentialedUrl(value)
  || isLikelyObjectKey(value)
  || isRawTriggerPayload(value)
  || isSensitiveSchedulerRuntimeString(value)
  || isWalletAddressString(value);

const isSensitiveSchedulerRuntimeString = (value: string): boolean =>
  /(bearer\s+|hook-secret|lease-token|object-key|queue-secret|scheduler-pass|scheduler-secret|scheduler-token|secret|token=|worker-token|x-amz-signature=|signed-url)/i.test(
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
  || /(^|\/)(exports?|evidence|attachments?)\/.+\.(csv|json|jsonl|parquet|zip)$/i.test(value);

const isWalletAddressString = (value: string): boolean =>
  /ELF_[A-Za-z0-9_]+|wallet[-_]?address/i.test(value);

const isRawTriggerPayload = (value: string): boolean => {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  return /address|job|payload|provider|schedule|task|trigger|wallet/i.test(trimmed);
};
