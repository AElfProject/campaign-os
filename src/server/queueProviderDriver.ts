import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createLiveQueuePublishingReadiness,
  evaluateLiveQueuePublishRequest,
  type LiveQueuePublishRequest,
  type LiveQueuePublishResult,
  type LiveQueuePublisher,
  type LiveQueuePublishingActivationStatus,
  type LiveQueuePublishingDiagnosticCode,
  type LiveQueuePublishingMode,
  type LiveQueuePublishingNoLiveSideEffects,
  type LiveQueuePublishingReadinessSummary,
  type LiveQueuePublishingStatus,
} from "./liveQueuePublishingReadiness";
import {
  createQueueProviderSdkBindingFoundation,
  type QueueProviderSdkBindingDiagnosticCode,
  type QueueProviderSdkBindingFoundationStatus,
  type QueueProviderSdkBindingMode,
  type QueueProviderSdkBindingOperationCapability,
  type QueueProviderSdkBindingProviderKind,
  type QueueProviderSdkPackageBindingSummary,
} from "./queueProviderSdkBinding";

export type QueueProviderDriverProfileId = BackendRuntimeProfileId;
export type QueueProviderDriverFoundationStatus = "local_ready" | "scaffolded" | "blocked";
export type QueueProviderDriverMode = "dry_run" | "metadata_only" | "production_required";
export type QueueProviderDriverOperation =
  | "publish"
  | "delayed_publish"
  | "ack"
  | "nack"
  | "retry"
  | "dead_letter"
  | "lease_handoff"
  | "metrics";
export type QueueProviderDriverDiagnosticSeverity = "error" | "warning" | "info";
export type QueueProviderDriverDiagnosticCode =
  | "UNKNOWN_QUEUE_PROVIDER_DRIVER_PROFILE"
  | "QUEUE_PROVIDER_DRIVER_MISSING"
  | "QUEUE_PROVIDER_DRIVER_UNSUPPORTED"
  | "QUEUE_PROVIDER_DRIVER_ENDPOINT_MISSING"
  | "QUEUE_PROVIDER_DRIVER_CREDENTIALS_MISSING"
  | "QUEUE_PROVIDER_DRIVER_QUEUE_ROUTE_MISSING"
  | "QUEUE_PROVIDER_DRIVER_DEAD_LETTER_ROUTE_MISSING"
  | "QUEUE_PROVIDER_DRIVER_RETRY_POLICY_MISSING"
  | "QUEUE_PROVIDER_DRIVER_IDEMPOTENCY_STORE_MISSING"
  | "QUEUE_PROVIDER_DRIVER_WORKER_LEASE_MISSING"
  | "QUEUE_PROVIDER_DRIVER_OBSERVABILITY_MISSING"
  | "QUEUE_PROVIDER_DRIVER_RUNBOOK_MISSING"
  | "QUEUE_PROVIDER_DRIVER_LIVE_ENABLEMENT_MISSING"
  | "UNKNOWN_QUEUE_PROVIDER_DRIVER_MODE"
  | "UNSAFE_QUEUE_PROVIDER_DRIVER_CONFIG"
  | "UNKNOWN_QUEUE_PROVIDER_OPERATION"
  | "UNKNOWN_QUEUE_ID"
  | "UNKNOWN_QUEUE_JOB"
  | "MISMATCHED_QUEUE_JOB"
  | "MISSING_TRACE_ID"
  | "INVALID_ATTEMPT"
  | "MISSING_PAYLOAD_REFERENCE"
  | "UNSAFE_PAYLOAD_REFERENCE"
  | "MISSING_IDEMPOTENCY_KEY"
  | "UNSAFE_IDEMPOTENCY_KEY"
  | "INVALID_PROVIDER_TIMESTAMP"
  | "UNSAFE_DEAD_LETTER_REASON"
  | "UNSAFE_PROVIDER_RESPONSE_REFERENCE"
  | QueueProviderSdkBindingDiagnosticCode;
export type QueueProviderDriverPreconditionArea =
  | "activation"
  | "auth"
  | "dead_letter"
  | "driver"
  | "endpoint"
  | "idempotency"
  | "lease"
  | "observability"
  | "queue"
  | "retry"
  | "runbook";
export type QueueProviderDriverHealthStatus = "local_ok" | "metadata_only" | "blocked";
export type QueueProviderDriverPublishAttemptPolicy =
  | "disabled_no_live"
  | "blocked_until_ready"
  | "request_required"
  | "request_evaluated";
export type QueueProviderDriverPublishResultStatus = "not_requested" | LiveQueuePublishResult["status"];

export interface QueueProviderDriverNoLiveFlags {
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
  liveTelemetryExportEnabled: false;
  liveWorkerExecutionEnabled: false;
}

export interface QueueProviderDriverProductionPrecondition {
  area: QueueProviderDriverPreconditionArea;
  diagnosticCode: QueueProviderDriverDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface QueueProviderDriverDiagnostic {
  code: QueueProviderDriverDiagnosticCode;
  field: string;
  message: string;
  severity: QueueProviderDriverDiagnosticSeverity;
}

export interface QueueProviderDriverOperationCapability {
  degradedOutcome: "blocked" | "manual_review" | "metadata_only" | "pending";
  liveEnabled: false;
  operation: QueueProviderDriverOperation;
  operatorNextAction: string;
  requiredBeforeProduction: boolean;
  requiredConfigKeys: string[];
  supported: boolean;
}

export interface QueueProviderDriverQueueRoute {
  jobIds: string[];
  queueId: string;
  requiredConfigKeys: string[];
  routeId: string;
}

export interface QueueProviderDriverDeadLetterRoute {
  deadLetterQueueId: string;
  queueId: string;
  requiredConfigKeys: string[];
  routeId: string;
}

export interface QueueProviderDriverHealthCheck {
  lastCheckedAt: string;
  liveProviderHealthCheckAttempted: false;
  status: QueueProviderDriverHealthStatus;
}

export interface QueueProviderDriverPublishingReadinessSummary {
  activationStatus: LiveQueuePublishingActivationStatus;
  blockerCount: number;
  diagnosticCodes: LiveQueuePublishingDiagnosticCode[];
  livePublishAttempted: boolean;
  liveQueuePublishingEnabled: boolean;
  mode: LiveQueuePublishingMode;
  noLiveSideEffects: LiveQueuePublishingNoLiveSideEffects;
  productionReady: false;
  publishAttemptAllowed: boolean;
  publisherId: string;
  publisherProvided: boolean;
  requiredConfigKeys: string[];
  status: LiveQueuePublishingStatus;
  valid: boolean;
}

export interface QueueProviderDriverPublishPosture {
  attemptPolicy: QueueProviderDriverPublishAttemptPolicy;
  diagnosticCodes: LiveQueuePublishingDiagnosticCode[];
  idempotencyReferenceRequired: true;
  livePublishAttempted: boolean;
  noLiveSideEffects: LiveQueuePublishingNoLiveSideEffects;
  payloadReferenceOrHashRequired: true;
  productionWriteAttempted: false;
  publishRequestEvaluated: boolean;
  published: boolean;
  resultStatus: QueueProviderDriverPublishResultStatus;
  safeIdempotencyReferenceRequired: true;
  safePayloadReferenceRequired: true;
}

export interface QueueProviderDriverReadinessProjection {
  activationGateSatisfied: boolean;
  blockerCount: number;
  deadLetterRouteCount: number;
  diagnosticCodes: QueueProviderDriverDiagnosticCode[];
  disabledLiveOperationCount: number;
  driverId: string;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: QueueProviderDriverMode;
  observabilityExporterStatus: "deferred";
  operationCount: number;
  productionReady: false;
  providerId: string;
  publishAttemptPolicy: QueueProviderDriverPublishAttemptPolicy;
  publishDiagnosticCodes: LiveQueuePublishingDiagnosticCode[];
  publishRequestEvaluated: boolean;
  publishResultStatus: QueueProviderDriverPublishResultStatus;
  publishingActivationStatus: LiveQueuePublishingActivationStatus;
  publishingBlockerCount: number;
  publishingLivePublishAttempted: boolean;
  publishingLiveQueuePublishingEnabled: boolean;
  publishingNoLiveSideEffects: LiveQueuePublishingNoLiveSideEffects;
  publishingPublisherId: string;
  publishingPublisherProvided: boolean;
  publishingRequiredConfigKeys: string[];
  publishingStatus: LiveQueuePublishingStatus;
  queueRouteCount: number;
  requiredConfigKeys: string[];
  sdkBinding: QueueProviderDriverSdkBindingSummary;
  status: QueueProviderDriverFoundationStatus;
  valid: boolean;
  workerIdempotencyStatus: "deferred";
  workerLeaseStatus: "deferred";
}

export interface QueueProviderDriverSdkBindingSummary {
  activationGateSatisfied: boolean;
  bindingId: string;
  blockerCount: number;
  brokerConnectionBlockerCount: number;
  brokerConnectionDiagnosticCodes: QueueProviderSdkPackageBindingSummary["brokerConnectionDiagnosticCodes"];
  brokerConnectionHealthCheckMode: QueueProviderSdkPackageBindingSummary["brokerConnectionHealthCheckMode"];
  brokerConnectionId: string;
  brokerConnectionRequiredConfigKeys: string[];
  brokerConnectionStatus: QueueProviderSdkPackageBindingSummary["brokerConnectionStatus"];
  deadLetterRouteCount: number;
  diagnosticCodes: QueueProviderSdkBindingDiagnosticCode[];
  disabledLiveOperationCount: number;
  liveProviderCallAttempted: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: QueueProviderSdkBindingMode;
  operationCapabilities: QueueProviderSdkBindingOperationCapability[];
  operationCount: number;
  packageBinding: QueueProviderSdkPackageBindingSummary;
  packageBindingBullmqConstructionAttempted: boolean;
  packageBindingBullmqConstructionBlockerCount: number;
  packageBindingBullmqConstructionDiagnosticCodes: QueueProviderSdkPackageBindingSummary["bullmqConstructionDiagnosticCodes"];
  packageBindingBullmqConstructionFactoryInvoked: boolean;
  packageBindingBullmqConstructionId: string;
  packageBindingBullmqConstructionProductionReady: false;
  packageBindingBullmqConstructionStatus: QueueProviderSdkPackageBindingSummary["bullmqConstructionStatus"];
  packageBindingQueueClientConstructed: boolean;
  packageBindingQueueEventsConstructed: boolean;
  packageBindingSdkClientConstructed: false;
  packageBindingWorkerConstructed: boolean;
  productionReady: false;
  providerKind: QueueProviderSdkBindingProviderKind;
  queueRouteCount: number;
  requiredConfigKeys: string[];
  sdkClientConstructed: false;
  sdkPackageRef: string;
  status: QueueProviderSdkBindingFoundationStatus;
  valid: boolean;
}

export interface QueueProviderDriverRegistration {
  activationGateSatisfied: boolean;
  deadLetterRoutes: QueueProviderDriverDeadLetterRoute[];
  driverId: string;
  healthCheck: QueueProviderDriverHealthCheck;
  mode: QueueProviderDriverMode;
  operationCapabilities: QueueProviderDriverOperationCapability[];
  publishPosture: QueueProviderDriverPublishPosture;
  publishingReadiness: QueueProviderDriverPublishingReadinessSummary;
  providerId: string;
  queueRoutes: QueueProviderDriverQueueRoute[];
  requiredConfigKeys: string[];
  status: QueueProviderDriverFoundationStatus;
}

export interface QueueProviderDriverFoundationSummary extends QueueProviderDriverRegistration {
  blockerCount: number;
  diagnosticCodes: QueueProviderDriverDiagnosticCode[];
  diagnostics: QueueProviderDriverDiagnostic[];
  id: "campaign-os-queue-provider-driver-foundation";
  noLiveFlags: QueueProviderDriverNoLiveFlags;
  preconditions: QueueProviderDriverProductionPrecondition[];
  productionReady: false;
  profileId: QueueProviderDriverProfileId;
  publishPosture: QueueProviderDriverPublishPosture;
  publishingReadiness: QueueProviderDriverPublishingReadinessSummary;
  readiness: QueueProviderDriverReadinessProjection;
  sdkBinding: QueueProviderDriverSdkBindingSummary;
  valid: boolean;
}

export interface CreateQueueProviderDriverFoundationOptions {
  driverId?: string;
  env?: Record<string, unknown>;
  liveQueuePublisher?: LiveQueuePublisher;
  liveQueuePublishRequest?: LiveQueuePublishRequest;
  liveQueuePublishingReadiness?: LiveQueuePublishingReadinessSummary;
  mode?: string;
  profileId?: string;
  providerId?: string;
}

export interface QueueProviderOperationRequest {
  attempt: number;
  deadLetterReason?: string;
  idempotencyKey: string;
  jobId: string;
  operation: QueueProviderDriverOperation;
  payloadReference: string;
  providerResponseReference?: string;
  queueId: string;
  requestedAt?: string;
  traceId: string;
}

export interface QueueProviderOperationResult {
  accepted: boolean;
  diagnosticCodes: QueueProviderDriverDiagnosticCode[];
  diagnostics: QueueProviderDriverDiagnostic[];
  driverId: string;
  idempotencyKey?: string;
  jobId?: string;
  livePublishAttempted: false;
  operation?: QueueProviderDriverOperation;
  operationId?: string;
  payloadReference?: string;
  productionWriteAttempted: false;
  providerId: string;
  providerResponseReference?: string;
  queueId?: string;
  requestedAt?: string;
  status: "accepted_local_fake" | "rejected" | "blocked_by_gate";
  traceId?: string;
}

export interface ExecuteLocalFakeQueueProviderOperationOptions {
  foundation?: QueueProviderDriverFoundationSummary;
}

const FOUNDATION_ID = "campaign-os-queue-provider-driver-foundation" as const;
const REDACTED_VALUE = "[redacted]";
const RAW_QUEUE_PAYLOAD_VALUE = "[redacted-queue-payload]";
const LOCAL_FAKE_PROVIDER_ID = "local-fake";
const LOCAL_FAKE_DRIVER_ID = "local-fake-queue-provider-driver";
const METADATA_PROVIDER_ID = "metadata-only";
const METADATA_DRIVER_ID = "metadata-only-queue-provider-driver";
const PRODUCTION_PROVIDER_ID = "production-queue-provider";
const PRODUCTION_DRIVER_ID = "production-provider-driver";
const HEALTH_CHECK_TIMESTAMP = "2026-07-07T00:00:00Z";
const MAX_LOCAL_FAKE_ATTEMPT = 10;

export const SUPPORTED_QUEUE_PROVIDER_DRIVER_PROFILES: QueueProviderDriverProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const queueProviderDriverNoLiveFlags: QueueProviderDriverNoLiveFlags = {
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
  liveTelemetryExportEnabled: false,
  liveWorkerExecutionEnabled: false,
};

export const queueProviderDriverProductionPreconditions: QueueProviderDriverProductionPrecondition[] = [
  precondition("driver", "QUEUE_PROVIDER_DRIVER_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER", "queue-provider-driver-selection", "Queue provider driver selection is required before live queue publishing."),
  precondition("endpoint", "QUEUE_PROVIDER_DRIVER_ENDPOINT_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT", "queue-provider-driver-endpoint", "Queue provider endpoint reference is required before live queue publishing."),
  precondition("auth", "QUEUE_PROVIDER_DRIVER_CREDENTIALS_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS", "queue-provider-driver-credentials", "Queue provider credential reference is required before live queue publishing."),
  precondition("queue", "QUEUE_PROVIDER_DRIVER_QUEUE_ROUTE_MISSING", "CAMPAIGN_OS_WORKER_QUEUE_URL", "queue-provider-driver-worker-queue", "Worker queue route is required before live queue publishing."),
  precondition("dead_letter", "QUEUE_PROVIDER_DRIVER_DEAD_LETTER_ROUTE_MISSING", "CAMPAIGN_OS_DEAD_LETTER_QUEUE", "queue-provider-driver-dead-letter", "Dead-letter route is required before live provider retries."),
  precondition("retry", "QUEUE_PROVIDER_DRIVER_RETRY_POLICY_MISSING", "CAMPAIGN_OS_WORKER_RETRY_POLICY", "queue-provider-driver-retry-policy", "Retry policy is required before live provider retries.", ["CAMPAIGN_OS_WORKER_RETRY_POLICY", "CAMPAIGN_OS_DEGRADATION_POLICY"]),
  precondition("idempotency", "QUEUE_PROVIDER_DRIVER_IDEMPOTENCY_STORE_MISSING", "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL", "queue-provider-driver-idempotency", "Idempotency store handoff is required before live queue publishing."),
  precondition("lease", "QUEUE_PROVIDER_DRIVER_WORKER_LEASE_MISSING", "CAMPAIGN_OS_WORKER_LEASE_STORE_URL", "queue-provider-driver-lease", "Worker lease store handoff is required before live worker/provider execution."),
  precondition("observability", "QUEUE_PROVIDER_DRIVER_OBSERVABILITY_MISSING", "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL", "queue-provider-driver-observability", "Observability exporter handoff is required before production queue provider visibility.", undefined, "deferred"),
  precondition("runbook", "QUEUE_PROVIDER_DRIVER_RUNBOOK_MISSING", "CAMPAIGN_OS_OPERATOR_RUNBOOK_URL", "queue-provider-driver-runbook", "Operator runbook reference is required before live queue provider activation.", undefined, "deferred"),
  precondition("activation", "QUEUE_PROVIDER_DRIVER_LIVE_ENABLEMENT_MISSING", "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT", "queue-provider-driver-live-enable-gate", "Explicit live queue enablement gate is required before live queue publishing."),
];

export const queueProviderDriverQueueRoutes: QueueProviderDriverQueueRoute[] = [
  route("verification-route", "verification-jobs", ["task-verification-worker", "eligibility-refresh-worker"]),
  route("lifecycle-route", "lifecycle-jobs", ["campaign-lifecycle-worker"]),
  route("operations-route", "operations-jobs", ["export-preparation-worker", "stale-review-cleanup-worker"]),
  route("analytics-route", "analytics-jobs", ["analytics-ingestion-handoff-worker"]),
  route("ai-ops-route", "ai-ops-jobs", ["ai-ops-report-worker"]),
  route("contract-route", "contract-jobs", ["contract-sync-handoff-worker"]),
  route("reward-route", "reward-jobs", ["reward-distribution-handoff-worker"]),
];

export const queueProviderDriverDeadLetterRoutes: QueueProviderDriverDeadLetterRoute[] =
  queueProviderDriverQueueRoutes.map((item) => ({
    deadLetterQueueId: `${item.queueId}-dead-letter`,
    queueId: item.queueId,
    requiredConfigKeys: ["CAMPAIGN_OS_DEAD_LETTER_QUEUE"],
    routeId: `${item.routeId}-dead-letter`,
  }));

export const queueProviderDriverOperationCapabilities: QueueProviderDriverOperationCapability[] = [
  capability("publish", true, true, ["CAMPAIGN_OS_WORKER_QUEUE_URL"], "pending"),
  capability("delayed_publish", true, true, ["CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT"], "metadata_only"),
  capability("ack", true, true, ["CAMPAIGN_OS_WORKER_QUEUE_URL"], "blocked"),
  capability("nack", true, true, ["CAMPAIGN_OS_WORKER_QUEUE_URL"], "manual_review"),
  capability("retry", true, true, ["CAMPAIGN_OS_WORKER_RETRY_POLICY"], "manual_review"),
  capability("dead_letter", true, true, ["CAMPAIGN_OS_DEAD_LETTER_QUEUE"], "manual_review"),
  capability("lease_handoff", true, true, ["CAMPAIGN_OS_WORKER_LEASE_STORE_URL"], "blocked"),
  capability("metrics", true, false, ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"], "metadata_only"),
];

export const createQueueProviderDriverFoundation = (
  options: CreateQueueProviderDriverFoundationOptions = {},
): QueueProviderDriverFoundationSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const modeResolution = resolveMode(profileResolution.profileId, options.mode);
  const providerResolution = resolveProviderId(options.providerId, env, profileResolution.profileId);
  const driverResolution = resolveDriverId(options.driverId, env, profileResolution.profileId, providerResolution.providerId);
  const sdkBindingFoundation = createQueueProviderSdkBindingFoundation({
    driverId: mapDriverToSdkBindingDriver(driverResolution.driverId),
    env,
    profileId: profileResolution.profileId,
    providerId: mapDriverProviderToSdkBindingProvider(providerResolution.providerId),
  });
  const sdkBinding = createSdkBindingSummary(sdkBindingFoundation);
  const liveQueuePublishingReadiness = options.liveQueuePublishingReadiness
    ?? createLiveQueuePublishingReadiness({
      env,
      profileId: profileResolution.profileId,
      publisher: options.liveQueuePublisher,
    });
  const publishingReadiness = createPublishingReadinessSummary(liveQueuePublishingReadiness);
  const publishPosture = createPublishPosture({
    liveQueuePublisher: options.liveQueuePublisher,
    liveQueuePublishRequest: options.liveQueuePublishRequest,
    readiness: liveQueuePublishingReadiness,
  });
  const activationGateSatisfied = isActivationGateSatisfied(env);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...modeResolution.diagnostics,
    ...providerResolution.diagnostics,
    ...driverResolution.diagnostics,
    ...productionDiagnostics,
    ...sdkBindingFoundation.diagnosticCodes.map((code) =>
      diagnostic(
        code,
        "queueProviderSdkBinding",
        `Queue provider SDK binding readiness reports ${code}.`,
      ),
    ),
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const status = resolveStatus(profileResolution.profileId, blockerCount);
  const valid = profileResolution.valid
    && modeResolution.valid
    && providerResolution.valid
    && driverResolution.valid
    && blockerCount === 0;
  const healthCheck = createHealthCheck(status);
  const registration = createRegistration({
    activationGateSatisfied,
    driverId: driverResolution.driverId,
    healthCheck,
    mode: modeResolution.mode,
    publishPosture,
    publishingReadiness,
    providerId: providerResolution.providerId,
    status,
  });
  const readiness = createReadinessProjection({
    activationGateSatisfied,
    blockerCount,
    diagnostics,
    driverId: driverResolution.driverId,
    mode: modeResolution.mode,
    publishPosture,
    publishingReadiness,
    providerId: providerResolution.providerId,
    sdkBinding,
    status,
    valid,
  });

  return {
    ...registration,
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: FOUNDATION_ID,
    noLiveFlags: queueProviderDriverNoLiveFlags,
    preconditions: queueProviderDriverProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    publishPosture,
    publishingReadiness,
    readiness,
    sdkBinding,
    valid,
  };
};

export const getQueueProviderDriverRegistration = (
  driverId: string = LOCAL_FAKE_DRIVER_ID,
): QueueProviderDriverRegistration | undefined => {
  const driver = sanitizeQueueProviderDriverString(driverId);

  if (driver === LOCAL_FAKE_DRIVER_ID) {
    return createRegistration({
      activationGateSatisfied: false,
      driverId: LOCAL_FAKE_DRIVER_ID,
      healthCheck: createHealthCheck("local_ready"),
      mode: "dry_run",
      publishPosture: createPublishPosture({
        readiness: createLiveQueuePublishingReadiness({ profileId: "local-review" }),
      }),
      publishingReadiness: createPublishingReadinessSummary(createLiveQueuePublishingReadiness({ profileId: "local-review" })),
      providerId: LOCAL_FAKE_PROVIDER_ID,
      status: "local_ready",
    });
  }

  if (driver === METADATA_DRIVER_ID) {
    return createRegistration({
      activationGateSatisfied: false,
      driverId: METADATA_DRIVER_ID,
      healthCheck: createHealthCheck("scaffolded"),
      mode: "metadata_only",
      publishPosture: createPublishPosture({
        readiness: createLiveQueuePublishingReadiness({ profileId: "staging-scaffold" }),
      }),
      publishingReadiness: createPublishingReadinessSummary(createLiveQueuePublishingReadiness({ profileId: "staging-scaffold" })),
      providerId: METADATA_PROVIDER_ID,
      status: "scaffolded",
    });
  }

  if (driver === PRODUCTION_DRIVER_ID) {
    return createRegistration({
      activationGateSatisfied: false,
      driverId: PRODUCTION_DRIVER_ID,
      healthCheck: createHealthCheck("blocked"),
      mode: "production_required",
      publishPosture: createPublishPosture({
        readiness: createLiveQueuePublishingReadiness({ profileId: "production-required" }),
      }),
      publishingReadiness: createPublishingReadinessSummary(createLiveQueuePublishingReadiness({ profileId: "production-required" })),
      providerId: PRODUCTION_PROVIDER_ID,
      status: "blocked",
    });
  }

  return undefined;
};

export const executeLocalFakeQueueProviderOperation = (
  request: QueueProviderOperationRequest,
  options: ExecuteLocalFakeQueueProviderOperationOptions = {},
): QueueProviderOperationResult => {
  const foundation = options.foundation ?? createQueueProviderDriverFoundation({ profileId: "local-review" });

  if (foundation.status === "blocked") {
    return {
      accepted: false,
      diagnosticCodes: foundation.diagnosticCodes,
      diagnostics: foundation.diagnostics,
      driverId: foundation.driverId,
      livePublishAttempted: false,
      productionWriteAttempted: false,
      providerId: foundation.providerId,
      status: "blocked_by_gate",
    };
  }

  const diagnostics = validateOperationRequest(request);
  const accepted = diagnostics.length === 0;

  return {
    accepted,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    driverId: foundation.driverId,
    idempotencyKey: sanitizeQueueProviderDriverString(request.idempotencyKey),
    jobId: sanitizeQueueProviderDriverString(request.jobId),
    livePublishAttempted: false,
    operation: isQueueProviderDriverOperation(request.operation) ? request.operation : undefined,
    operationId: accepted
      ? createOperationId(request.operation, request.queueId, request.jobId, request.attempt)
      : undefined,
    payloadReference: sanitizeQueueProviderDriverString(request.payloadReference),
    productionWriteAttempted: false,
    providerId: foundation.providerId,
    providerResponseReference: request.providerResponseReference
      ? sanitizeQueueProviderDriverString(request.providerResponseReference)
      : undefined,
    queueId: sanitizeQueueProviderDriverString(request.queueId),
    requestedAt: request.requestedAt ? sanitizeQueueProviderDriverString(request.requestedAt) : undefined,
    status: accepted ? "accepted_local_fake" : "rejected",
    traceId: sanitizeQueueProviderDriverString(request.traceId),
  };
};

export const redactQueueProviderDriverValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactQueueProviderDriverValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveQueueProviderDriverKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactQueueProviderDriverValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawQueuePayload(value)) {
    return RAW_QUEUE_PAYLOAD_VALUE;
  }

  if (isUnsafeQueueProviderDriverString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function precondition(
  area: QueueProviderDriverPreconditionArea,
  diagnosticCode: QueueProviderDriverDiagnosticCode,
  field: string,
  id: string,
  message: string,
  requiredConfigKeys = [field],
  status: QueueProviderDriverProductionPrecondition["status"] = "blocked",
): QueueProviderDriverProductionPrecondition {
  return {
    area,
    diagnosticCode,
    field,
    id,
    message,
    requiredBeforeProduction: true,
    requiredConfigKeys,
    status,
  };
}

function route(routeId: string, queueId: string, jobIds: string[]): QueueProviderDriverQueueRoute {
  return {
    jobIds,
    queueId,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_QUEUE_URL"],
    routeId,
  };
}

function capability(
  operation: QueueProviderDriverOperation,
  supported: boolean,
  requiredBeforeProduction: boolean,
  requiredConfigKeys: string[],
  degradedOutcome: QueueProviderDriverOperationCapability["degradedOutcome"],
): QueueProviderDriverOperationCapability {
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

function operationNextAction(operation: QueueProviderDriverOperation): string {
  const labels: Record<QueueProviderDriverOperation, string> = {
    ack: "Keep ack metadata local until worker lease and provider SDK binding are approved.",
    dead_letter: "Keep dead-letter routing metadata local until a live dead-letter provider route is approved.",
    delayed_publish: "Keep delayed publish metadata local until provider scheduling is approved.",
    lease_handoff: "Keep lease handoff metadata local until worker lease execution is approved.",
    metrics: "Expose metrics metadata only until live telemetry export is approved.",
    nack: "Keep nack metadata local until retry/degradation semantics are approved.",
    publish: "Use local fake publish metadata only; do not publish live queue messages.",
    retry: "Keep retry metadata local until retry policy and idempotency stores are approved.",
  };

  return labels[operation];
}

function createRegistration(input: {
  activationGateSatisfied: boolean;
  driverId: string;
  healthCheck: QueueProviderDriverHealthCheck;
  mode: QueueProviderDriverMode;
  publishPosture: QueueProviderDriverPublishPosture;
  publishingReadiness: QueueProviderDriverPublishingReadinessSummary;
  providerId: string;
  status: QueueProviderDriverFoundationStatus;
}): QueueProviderDriverRegistration {
  return {
    activationGateSatisfied: input.activationGateSatisfied,
    deadLetterRoutes: queueProviderDriverDeadLetterRoutes.map((item) => ({ ...item })),
    driverId: input.driverId,
    healthCheck: input.healthCheck,
    mode: input.mode,
    operationCapabilities: queueProviderDriverOperationCapabilities.map((item) => ({ ...item })),
    publishPosture: clonePublishPosture(input.publishPosture),
    publishingReadiness: clonePublishingReadiness(input.publishingReadiness),
    providerId: input.providerId,
    queueRoutes: queueProviderDriverQueueRoutes.map((item) => ({ ...item, jobIds: [...item.jobIds] })),
    requiredConfigKeys: [
      ...new Set(queueProviderDriverProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
    ],
    status: input.status,
  };
}

function createReadinessProjection(input: {
  activationGateSatisfied: boolean;
  blockerCount: number;
  diagnostics: readonly QueueProviderDriverDiagnostic[];
  driverId: string;
  mode: QueueProviderDriverMode;
  publishPosture: QueueProviderDriverPublishPosture;
  publishingReadiness: QueueProviderDriverPublishingReadinessSummary;
  providerId: string;
  sdkBinding: QueueProviderDriverSdkBindingSummary;
  status: QueueProviderDriverFoundationStatus;
  valid: boolean;
}): QueueProviderDriverReadinessProjection {
  return {
    activationGateSatisfied: input.activationGateSatisfied,
    blockerCount: input.blockerCount,
    deadLetterRouteCount: queueProviderDriverDeadLetterRoutes.length,
    diagnosticCodes: input.diagnostics.map((item) => item.code),
    disabledLiveOperationCount: queueProviderDriverOperationCapabilities.length,
    driverId: input.driverId,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: input.mode,
    observabilityExporterStatus: "deferred",
    operationCount: queueProviderDriverOperationCapabilities.length,
    productionReady: false,
    providerId: input.providerId,
    publishAttemptPolicy: input.publishPosture.attemptPolicy,
    publishDiagnosticCodes: [...input.publishPosture.diagnosticCodes],
    publishRequestEvaluated: input.publishPosture.publishRequestEvaluated,
    publishResultStatus: input.publishPosture.resultStatus,
    publishingActivationStatus: input.publishingReadiness.activationStatus,
    publishingBlockerCount: input.publishingReadiness.blockerCount,
    publishingLivePublishAttempted: input.publishPosture.livePublishAttempted,
    publishingLiveQueuePublishingEnabled: input.publishingReadiness.liveQueuePublishingEnabled,
    publishingNoLiveSideEffects: { ...input.publishingReadiness.noLiveSideEffects },
    publishingPublisherId: input.publishingReadiness.publisherId,
    publishingPublisherProvided: input.publishingReadiness.publisherProvided,
    publishingRequiredConfigKeys: [...input.publishingReadiness.requiredConfigKeys],
    publishingStatus: input.publishingReadiness.status,
    queueRouteCount: queueProviderDriverQueueRoutes.length,
    requiredConfigKeys: [
      ...new Set([
        ...queueProviderDriverProductionPreconditions.flatMap((item) => item.requiredConfigKeys),
        ...input.publishingReadiness.requiredConfigKeys,
        ...input.sdkBinding.requiredConfigKeys,
      ]),
    ],
    sdkBinding: cloneSdkBindingSummary(input.sdkBinding),
    status: input.status,
    valid: input.valid,
    workerIdempotencyStatus: "deferred",
    workerLeaseStatus: "deferred",
  };
}

function createPublishingReadinessSummary(
  readiness: LiveQueuePublishingReadinessSummary,
): QueueProviderDriverPublishingReadinessSummary {
  return {
    activationStatus: readiness.activationStatus,
    blockerCount: readiness.blockerCount,
    diagnosticCodes: [...readiness.diagnosticCodes],
    livePublishAttempted: false,
    liveQueuePublishingEnabled: readiness.liveQueuePublishingEnabled,
    mode: readiness.mode,
    noLiveSideEffects: { ...readiness.noLiveSideEffects },
    productionReady: false,
    publishAttemptAllowed: readiness.publishAttemptAllowed,
    publisherId: readiness.publisherId,
    publisherProvided: readiness.publisherProvided,
    requiredConfigKeys: [...readiness.requiredConfigKeys],
    status: readiness.status,
    valid: readiness.valid,
  };
}

function createPublishPosture(input: {
  liveQueuePublisher?: LiveQueuePublisher;
  liveQueuePublishRequest?: LiveQueuePublishRequest;
  readiness: LiveQueuePublishingReadinessSummary;
}): QueueProviderDriverPublishPosture {
  if (!input.liveQueuePublishRequest) {
    return {
      attemptPolicy: input.readiness.publishAttemptAllowed ? "request_required" : resolveBlockedPublishPolicy(input.readiness.status),
      diagnosticCodes: [...input.readiness.diagnosticCodes],
      idempotencyReferenceRequired: true,
      livePublishAttempted: false,
      noLiveSideEffects: { ...input.readiness.noLiveSideEffects },
      payloadReferenceOrHashRequired: true,
      productionWriteAttempted: false,
      publishRequestEvaluated: false,
      published: false,
      resultStatus: "not_requested",
      safeIdempotencyReferenceRequired: true,
      safePayloadReferenceRequired: true,
    };
  }

  const result = evaluateLiveQueuePublishRequest(
    input.liveQueuePublishRequest,
    {
      publisher: input.liveQueuePublisher,
      readiness: input.readiness,
    },
  );

  return {
    attemptPolicy: "request_evaluated",
    diagnosticCodes: [...result.diagnosticCodes],
    idempotencyReferenceRequired: true,
    livePublishAttempted: result.livePublishAttempted,
    noLiveSideEffects: { ...result.noLiveSideEffects },
    payloadReferenceOrHashRequired: true,
    productionWriteAttempted: false,
    publishRequestEvaluated: true,
    published: result.published,
    resultStatus: result.status,
    safeIdempotencyReferenceRequired: true,
    safePayloadReferenceRequired: true,
  };
}

function resolveBlockedPublishPolicy(
  readinessStatus: LiveQueuePublishingStatus,
): QueueProviderDriverPublishAttemptPolicy {
  return readinessStatus === "disabled" || readinessStatus === "scaffolded"
    ? "disabled_no_live"
    : "blocked_until_ready";
}

function clonePublishingReadiness(
  readiness: QueueProviderDriverPublishingReadinessSummary,
): QueueProviderDriverPublishingReadinessSummary {
  return {
    ...readiness,
    diagnosticCodes: [...readiness.diagnosticCodes],
    noLiveSideEffects: { ...readiness.noLiveSideEffects },
    requiredConfigKeys: [...readiness.requiredConfigKeys],
  };
}

function clonePublishPosture(
  publishPosture: QueueProviderDriverPublishPosture,
): QueueProviderDriverPublishPosture {
  return {
    ...publishPosture,
    diagnosticCodes: [...publishPosture.diagnosticCodes],
    noLiveSideEffects: { ...publishPosture.noLiveSideEffects },
  };
}

function createSdkBindingSummary(
  sdkBinding: ReturnType<typeof createQueueProviderSdkBindingFoundation>,
): QueueProviderDriverSdkBindingSummary {
  return {
    activationGateSatisfied: sdkBinding.readiness.activationGateSatisfied,
    bindingId: sdkBinding.bindingId,
    blockerCount: sdkBinding.blockerCount,
    brokerConnectionBlockerCount: sdkBinding.readiness.packageBindingBrokerConnectionBlockerCount,
    brokerConnectionDiagnosticCodes: [...sdkBinding.readiness.packageBindingBrokerConnectionDiagnosticCodes],
    brokerConnectionHealthCheckMode: sdkBinding.readiness.packageBindingBrokerConnectionHealthCheckMode,
    brokerConnectionId: sdkBinding.readiness.packageBindingBrokerConnectionId,
    brokerConnectionRequiredConfigKeys: [...sdkBinding.readiness.packageBindingBrokerConnectionRequiredConfigKeys],
    brokerConnectionStatus: sdkBinding.readiness.packageBindingBrokerConnectionStatus,
    deadLetterRouteCount: sdkBinding.readiness.deadLetterRouteCount,
    diagnosticCodes: sdkBinding.diagnosticCodes,
    disabledLiveOperationCount: sdkBinding.readiness.disabledLiveOperationCount,
    liveProviderCallAttempted: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: sdkBinding.mode,
    operationCapabilities: sdkBinding.operationCapabilities.map((item) => ({ ...item })),
    operationCount: sdkBinding.readiness.operationCount,
    packageBinding: clonePackageBindingSummary(sdkBinding.packageBinding),
    packageBindingBullmqConstructionAttempted: sdkBinding.readiness.packageBindingBullmqConstructionAttempted,
    packageBindingBullmqConstructionBlockerCount: sdkBinding.readiness.packageBindingBullmqConstructionBlockerCount,
    packageBindingBullmqConstructionDiagnosticCodes: [...sdkBinding.readiness.packageBindingBullmqConstructionDiagnosticCodes],
    packageBindingBullmqConstructionFactoryInvoked: sdkBinding.readiness.packageBindingBullmqConstructionFactoryInvoked,
    packageBindingBullmqConstructionId: sdkBinding.readiness.packageBindingBullmqConstructionId,
    packageBindingBullmqConstructionProductionReady: false,
    packageBindingBullmqConstructionStatus: sdkBinding.readiness.packageBindingBullmqConstructionStatus,
    packageBindingQueueClientConstructed: sdkBinding.readiness.packageBindingQueueClientConstructed,
    packageBindingQueueEventsConstructed: sdkBinding.readiness.packageBindingQueueEventsConstructed,
    packageBindingSdkClientConstructed: false,
    packageBindingWorkerConstructed: sdkBinding.readiness.packageBindingWorkerConstructed,
    productionReady: false,
    providerKind: sdkBinding.providerKind,
    queueRouteCount: sdkBinding.readiness.queueRouteCount,
    requiredConfigKeys: sdkBinding.readiness.requiredConfigKeys,
    sdkClientConstructed: false,
    sdkPackageRef: sdkBinding.sdkPackageRef,
    status: sdkBinding.status,
    valid: sdkBinding.valid,
  };
}

function cloneSdkBindingSummary(
  sdkBinding: QueueProviderDriverSdkBindingSummary,
): QueueProviderDriverSdkBindingSummary {
  return {
    ...sdkBinding,
    brokerConnectionDiagnosticCodes: [...sdkBinding.brokerConnectionDiagnosticCodes],
    brokerConnectionRequiredConfigKeys: [...sdkBinding.brokerConnectionRequiredConfigKeys],
    diagnosticCodes: [...sdkBinding.diagnosticCodes],
    operationCapabilities: sdkBinding.operationCapabilities.map((item) => ({ ...item })),
    packageBinding: clonePackageBindingSummary(sdkBinding.packageBinding),
    packageBindingBullmqConstructionDiagnosticCodes: [...sdkBinding.packageBindingBullmqConstructionDiagnosticCodes],
    requiredConfigKeys: [...sdkBinding.requiredConfigKeys],
  };
}

function clonePackageBindingSummary(
  packageBinding: QueueProviderSdkPackageBindingSummary,
): QueueProviderSdkPackageBindingSummary {
  return {
    ...packageBinding,
    brokerConnection: {
      ...packageBinding.brokerConnection,
      diagnosticCodes: [...packageBinding.brokerConnection.diagnosticCodes],
      requiredConfigKeys: [...packageBinding.brokerConnection.requiredConfigKeys],
    },
    brokerConnectionDiagnosticCodes: [...packageBinding.brokerConnectionDiagnosticCodes],
    brokerConnectionRequiredConfigKeys: [...packageBinding.brokerConnectionRequiredConfigKeys],
    bullmqConstruction: {
      ...packageBinding.bullmqConstruction,
      diagnosticCodes: [...packageBinding.bullmqConstruction.diagnosticCodes],
    },
    bullmqConstructionDiagnosticCodes: [...packageBinding.bullmqConstructionDiagnosticCodes],
    diagnosticCodes: [...packageBinding.diagnosticCodes],
    requiredConfigKeys: [...packageBinding.requiredConfigKeys],
  };
}

function createHealthCheck(status: QueueProviderDriverFoundationStatus): QueueProviderDriverHealthCheck {
  return {
    lastCheckedAt: HEALTH_CHECK_TIMESTAMP,
    liveProviderHealthCheckAttempted: false,
    status: status === "local_ready" ? "local_ok" : status === "scaffolded" ? "metadata_only" : "blocked",
  };
}

function diagnostic(
  code: QueueProviderDriverDiagnosticCode,
  field: string,
  message: string,
  severity: QueueProviderDriverDiagnosticSeverity = "error",
): QueueProviderDriverDiagnostic {
  return {
    code,
    field,
    message,
    severity,
  };
}

function resolveProfile(
  requestedProfileId: string | undefined,
): { diagnostics: QueueProviderDriverDiagnostic[]; profileId: QueueProviderDriverProfileId; valid: boolean } {
  const profileId = requestedProfileId ?? "local-review";

  if (isQueueProviderDriverProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_QUEUE_PROVIDER_DRIVER_PROFILE",
        "profileId",
        `Unsupported queue provider driver profile: ${sanitizeQueueProviderDriverString(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
}

function resolveMode(
  profileId: QueueProviderDriverProfileId,
  requestedMode: string | undefined,
): { diagnostics: QueueProviderDriverDiagnostic[]; mode: QueueProviderDriverMode; valid: boolean } {
  const defaultMode = profileId === "local-review"
    ? "dry_run"
    : profileId === "staging-scaffold"
      ? "metadata_only"
      : "production_required";

  if (!requestedMode) {
    return {
      diagnostics: [],
      mode: defaultMode,
      valid: true,
    };
  }

  if (isQueueProviderDriverMode(requestedMode) && !isUnsafeQueueProviderDriverString(requestedMode)) {
    return {
      diagnostics: [],
      mode: requestedMode,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_QUEUE_PROVIDER_DRIVER_MODE",
        "mode",
        `Unsupported queue provider driver mode: ${sanitizeQueueProviderDriverString(requestedMode)}`,
      ),
    ],
    mode: "production_required",
    valid: false,
  };
}

function resolveProviderId(
  requestedProviderId: string | undefined,
  env: Record<string, unknown>,
  profileId: QueueProviderDriverProfileId,
): { diagnostics: QueueProviderDriverDiagnostic[]; providerId: string; valid: boolean } {
  const envProvider = env.CAMPAIGN_OS_QUEUE_PROVIDER;
  const rawProviderId =
    requestedProviderId
    ?? (typeof envProvider === "string" && envProvider.trim().length > 0 ? envProvider : undefined)
    ?? (profileId === "staging-scaffold"
      ? METADATA_PROVIDER_ID
      : profileId === "production-required"
        ? PRODUCTION_PROVIDER_ID
        : LOCAL_FAKE_PROVIDER_ID);

  if (!isSafeLabel(rawProviderId) || isUnsafeQueueProviderDriverString(rawProviderId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_QUEUE_PROVIDER_DRIVER_CONFIG", "providerId", "Queue provider id contains unsafe material."),
      ],
      providerId: "blocked-provider",
      valid: false,
    };
  }

  if (!isSupportedProviderId(rawProviderId)) {
    return {
      diagnostics: [
        diagnostic(
          "QUEUE_PROVIDER_DRIVER_UNSUPPORTED",
          "providerId",
          `Queue provider is not supported by the M192 driver registry: ${sanitizeQueueProviderDriverString(rawProviderId)}`,
        ),
      ],
      providerId: rawProviderId,
      valid: false,
    };
  }

  return {
    diagnostics: [],
    providerId: rawProviderId,
    valid: true,
  };
}

function resolveDriverId(
  requestedDriverId: string | undefined,
  env: Record<string, unknown>,
  profileId: QueueProviderDriverProfileId,
  providerId: string,
): { diagnostics: QueueProviderDriverDiagnostic[]; driverId: string; valid: boolean } {
  const envDriver = env.CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER;
  const rawDriverId =
    requestedDriverId
    ?? (typeof envDriver === "string" && envDriver.trim().length > 0 ? envDriver : undefined)
    ?? (profileId === "staging-scaffold"
      ? METADATA_DRIVER_ID
      : profileId === "production-required"
        ? PRODUCTION_DRIVER_ID
        : `${providerId}-queue-provider-driver`);

  if (!isSafeLabel(rawDriverId) || isUnsafeQueueProviderDriverString(rawDriverId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_QUEUE_PROVIDER_DRIVER_CONFIG", "driverId", "Queue provider driver id contains unsafe material."),
      ],
      driverId: "blocked-driver",
      valid: false,
    };
  }

  if (!isSupportedDriverId(rawDriverId)) {
    return {
      diagnostics: [
        diagnostic(
          "QUEUE_PROVIDER_DRIVER_UNSUPPORTED",
          "driverId",
          `Queue provider driver is not supported by the M192 driver registry: ${sanitizeQueueProviderDriverString(rawDriverId)}`,
        ),
      ],
      driverId: rawDriverId,
      valid: false,
    };
  }

  return {
    diagnostics: [],
    driverId: rawDriverId,
    valid: true,
  };
}

function createProductionDiagnostics(env: Record<string, unknown>): QueueProviderDriverDiagnostic[] {
  return queueProviderDriverProductionPreconditions
    .filter((item) => {
      if (item.diagnosticCode === "QUEUE_PROVIDER_DRIVER_LIVE_ENABLEMENT_MISSING") {
        return !isActivationGateSatisfied(env);
      }

      return !hasConfiguredValue(env, item.requiredConfigKeys);
    })
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));
}

function validateOperationRequest(request: QueueProviderOperationRequest): QueueProviderDriverDiagnostic[] {
  const diagnostics: QueueProviderDriverDiagnostic[] = [];
  const route = queueProviderDriverQueueRoutes.find((item) => item.queueId === request.queueId);

  if (!isQueueProviderDriverOperation(request.operation)) {
    diagnostics.push(
      diagnostic("UNKNOWN_QUEUE_PROVIDER_OPERATION", "operation", "Queue provider operation is not supported."),
    );
  }

  if (!route) {
    diagnostics.push(
      diagnostic("UNKNOWN_QUEUE_ID", "queueId", `Unknown queue id: ${sanitizeQueueProviderDriverString(request.queueId)}`),
    );
  }

  if (!knownJobIds.has(request.jobId)) {
    diagnostics.push(
      diagnostic("UNKNOWN_QUEUE_JOB", "jobId", `Unknown queue job id: ${sanitizeQueueProviderDriverString(request.jobId)}`),
    );
  } else if (route && !route.jobIds.includes(request.jobId)) {
    diagnostics.push(
      diagnostic(
        "MISMATCHED_QUEUE_JOB",
        "jobId",
        `Queue job ${sanitizeQueueProviderDriverString(request.jobId)} does not belong to queue ${sanitizeQueueProviderDriverString(request.queueId)}.`,
      ),
    );
  }

  if (!request.traceId.trim()) {
    diagnostics.push(diagnostic("MISSING_TRACE_ID", "traceId", "Trace id is required for queue provider driver operation."));
  }

  if (!Number.isInteger(request.attempt) || request.attempt < 1 || request.attempt > MAX_LOCAL_FAKE_ATTEMPT) {
    diagnostics.push(
      diagnostic("INVALID_ATTEMPT", "attempt", `Queue provider operation attempt must be 1-${MAX_LOCAL_FAKE_ATTEMPT}.`),
    );
  }

  if (!request.payloadReference.trim()) {
    diagnostics.push(
      diagnostic("MISSING_PAYLOAD_REFERENCE", "payloadReference", "Payload reference is required for queue provider operation."),
    );
  } else if (!isSafeReference(request.payloadReference) || isUnsafeQueueProviderDriverString(request.payloadReference)) {
    diagnostics.push(
      diagnostic("UNSAFE_PAYLOAD_REFERENCE", "payloadReference", "Payload reference must not contain raw payload material."),
    );
  }

  if (!request.idempotencyKey.trim()) {
    diagnostics.push(
      diagnostic("MISSING_IDEMPOTENCY_KEY", "idempotencyKey", "Idempotency reference is required for queue provider operation."),
    );
  } else if (!isSafeReference(request.idempotencyKey) || isUnsafeQueueProviderDriverString(request.idempotencyKey)) {
    diagnostics.push(
      diagnostic("UNSAFE_IDEMPOTENCY_KEY", "idempotencyKey", "Idempotency reference must not contain raw key material."),
    );
  }

  if (request.requestedAt && Number.isNaN(Date.parse(request.requestedAt))) {
    diagnostics.push(
      diagnostic("INVALID_PROVIDER_TIMESTAMP", "requestedAt", "Queue provider operation timestamp is invalid."),
    );
  }

  if (
    request.deadLetterReason
    && (!isSafeReference(request.deadLetterReason) || isUnsafeQueueProviderDriverString(request.deadLetterReason))
  ) {
    diagnostics.push(
      diagnostic("UNSAFE_DEAD_LETTER_REASON", "deadLetterReason", "Dead-letter reason reference is unsafe."),
    );
  }

  if (
    request.providerResponseReference
    && (!isSafeReference(request.providerResponseReference)
      || isUnsafeQueueProviderDriverString(request.providerResponseReference))
  ) {
    diagnostics.push(
      diagnostic(
        "UNSAFE_PROVIDER_RESPONSE_REFERENCE",
        "providerResponseReference",
        "Provider response reference must not contain raw provider response material.",
      ),
    );
  }

  return diagnostics;
}

function createOperationId(
  operation: QueueProviderDriverOperation,
  queueId: string,
  jobId: string,
  attempt: number,
): string {
  return `local-fake:${operation}:${sanitizeQueueProviderDriverString(queueId)}:${sanitizeQueueProviderDriverString(jobId)}:attempt-${attempt}`;
}

const knownJobIds = new Set(queueProviderDriverQueueRoutes.flatMap((item) => item.jobIds));

function hasConfiguredValue(env: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.every((key) => {
    const value = env[key];

    return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
  });
}

function isActivationGateSatisfied(env: Record<string, unknown>): boolean {
  const value = env.CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT;

  return typeof value === "string" && /^(enabled|explicitly-enabled|true)$/i.test(value.trim());
}

function resolveStatus(
  profileId: QueueProviderDriverProfileId,
  blockerCount: number,
): QueueProviderDriverFoundationStatus {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "local-review" ? "local_ready" : "scaffolded";
}

function isQueueProviderDriverProfileId(value: string): value is QueueProviderDriverProfileId {
  return SUPPORTED_QUEUE_PROVIDER_DRIVER_PROFILES.includes(value as QueueProviderDriverProfileId);
}

function isQueueProviderDriverMode(value: string): value is QueueProviderDriverMode {
  return value === "dry_run" || value === "metadata_only" || value === "production_required";
}

function isQueueProviderDriverOperation(value: string): value is QueueProviderDriverOperation {
  return queueProviderDriverOperationCapabilities.some((item) => item.operation === value);
}

function isSupportedProviderId(value: string): boolean {
  return value === LOCAL_FAKE_PROVIDER_ID || value === METADATA_PROVIDER_ID || value === PRODUCTION_PROVIDER_ID;
}

function isSupportedDriverId(value: string): boolean {
  return value === LOCAL_FAKE_DRIVER_ID || value === METADATA_DRIVER_ID || value === PRODUCTION_DRIVER_ID;
}

function mapDriverProviderToSdkBindingProvider(providerId: string): string {
  const mapping: Record<string, string> = {
    "local-fake": "local-stub",
    "metadata-only": "metadata-only",
    "production-queue-provider": "production-queue-provider",
  };

  return mapping[providerId] ?? providerId;
}

function mapDriverToSdkBindingDriver(driverId: string): string {
  const mapping: Record<string, string> = {
    "local-fake-queue-provider-driver": "local-stub-queue-provider-driver",
    "metadata-only-queue-provider-driver": "metadata-only-queue-provider-driver",
    "production-provider-driver": "production-provider-driver",
  };

  return mapping[driverId] ?? driverId;
}

function isSafeLabel(value: string): boolean {
  return /^[a-z][a-z0-9-]{2,63}$/i.test(value);
}

function isSafeReference(value: string): boolean {
  return /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*(?::[a-z0-9][a-z0-9-]*)*$/i.test(value);
}

function sanitizeQueueProviderDriverString(value: string): string {
  const redacted = redactQueueProviderDriverValue(value);

  return typeof redacted === "string" ? redacted : REDACTED_VALUE;
}

function isSensitiveQueueProviderDriverKey(key: string): boolean {
  return /api[-_]?key|bearer|credential|dead[-_]?letter[-_]?payload|endpoint|idempotency[-_]?(key|token)|lease[-_]?token|object[-_]?key|payload|private[-_]?key|provider[-_]?(payload|response)|queue[-_]?(credential|payload|url)|secret|signed[-_]?url|token|webhook|wallet/i.test(
    key,
  );
}

function isUnsafeQueueProviderDriverString(value: string): boolean {
  return isCredentialedUrl(value)
    || isLikelyObjectKey(value)
    || isSensitiveQueueProviderDriverString(value)
    || isWalletAddressString(value)
    || isRawQueuePayload(value);
}

function isSensitiveQueueProviderDriverString(value: string): boolean {
  return /(api[-_]?key|bearer\s+|hook-secret|idempotency-key|lease-token|private[-_]?key|provider-response-fragment|queue-secret|secret|token=|worker-token|x-amz-signature=|signed-url)/i.test(
    value,
  );
}

function isCredentialedUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return Boolean(url.username || url.password || url.searchParams.size > 0);
  } catch {
    return false;
  }
}

function isLikelyObjectKey(value: string): boolean {
  return /^[a-z0-9][a-z0-9-_]*\/.+\.(csv|json|jsonl|parquet|zip)$/i.test(value)
    || /(^|\/)(exports?|evidence|attachments?|queue-payloads?)\/.+\.(csv|json|jsonl|parquet|zip)$/i.test(value);
}

function isWalletAddressString(value: string): boolean {
  return /ELF_[A-Za-z0-9_]+|wallet[-_]?address/i.test(value);
}

function isRawQueuePayload(value: string): boolean {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  return /address|contract|job|payload|provider|queue|reward|task|wallet|worker/i.test(trimmed);
}
