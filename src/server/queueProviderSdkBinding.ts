import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createQueueProviderPackageBinding,
  type QueueProviderBrokerConnectionPosture,
  type QueueProviderPackageBindingMode,
  type QueueProviderPackageBindingStatus,
  type QueueProviderPackageDiagnosticCode,
  type QueueProviderPackageFamily,
  type QueueProviderPackageImportPosture,
  type QueueProviderPackageProviderKind,
} from "./queueProviderPackageBinding";

export type QueueProviderSdkBindingProfileId = BackendRuntimeProfileId;
export type QueueProviderSdkBindingFoundationStatus = "local_ready" | "scaffolded" | "blocked";
export type QueueProviderSdkBindingMode = "dry_run" | "metadata_only" | "production_required";
export type QueueProviderSdkBindingProviderKind =
  | "local-stub"
  | "redis-compatible"
  | "sqs-compatible"
  | "pubsub-compatible"
  | "rabbitmq-compatible"
  | "cloud-tasks-compatible";
export type QueueProviderSdkBindingOperation =
  | "publish"
  | "delayed_publish"
  | "ack"
  | "nack"
  | "retry"
  | "dead_letter"
  | "lease_handoff"
  | "metrics";
export type QueueProviderSdkBindingDiagnosticSeverity = "error" | "warning" | "info";
export type QueueProviderSdkBindingDiagnosticCode =
  | "UNKNOWN_QUEUE_PROVIDER_SDK_BINDING_PROFILE"
  | "QUEUE_PROVIDER_SDK_PACKAGE_MISSING"
  | "QUEUE_PROVIDER_SDK_BINDING_MISSING"
  | "QUEUE_PROVIDER_DRIVER_MISSING"
  | "QUEUE_PROVIDER_SDK_ENDPOINT_MISSING"
  | "QUEUE_PROVIDER_SDK_CREDENTIALS_MISSING"
  | "QUEUE_PROVIDER_SDK_QUEUE_ROUTE_MISSING"
  | "QUEUE_PROVIDER_SDK_DEAD_LETTER_ROUTE_MISSING"
  | "QUEUE_PROVIDER_SDK_RETRY_POLICY_MISSING"
  | "QUEUE_PROVIDER_SDK_IDEMPOTENCY_STORE_MISSING"
  | "QUEUE_PROVIDER_SDK_WORKER_LEASE_MISSING"
  | "QUEUE_PROVIDER_SDK_OBSERVABILITY_MISSING"
  | "QUEUE_PROVIDER_SDK_RUNBOOK_MISSING"
  | "QUEUE_PROVIDER_SDK_LIVE_ENABLEMENT_MISSING"
  | "UNKNOWN_QUEUE_PROVIDER_SDK_BINDING_MODE"
  | "UNKNOWN_QUEUE_PROVIDER_SDK_BINDING_PROVIDER_KIND"
  | "QUEUE_PROVIDER_SDK_BINDING_UNSUPPORTED"
  | "QUEUE_PROVIDER_SDK_PACKAGE_UNSUPPORTED"
  | "UNSAFE_QUEUE_PROVIDER_SDK_BINDING_CONFIG"
  | "UNKNOWN_QUEUE_PROVIDER_OPERATION"
  | "UNKNOWN_QUEUE_ID"
  | "UNKNOWN_QUEUE_JOB"
  | "MISMATCHED_QUEUE_JOB"
  | "MISSING_TRACE_ID"
  | "INVALID_ATTEMPT"
  | "MISSING_PAYLOAD_REFERENCE"
  | "UNSAFE_PAYLOAD_REFERENCE"
  | "MISSING_IDEMPOTENCY_REFERENCE"
  | "UNSAFE_IDEMPOTENCY_REFERENCE"
  | "INVALID_PROVIDER_TIMESTAMP"
  | "UNSAFE_DEAD_LETTER_REASON"
  | "UNSAFE_PROVIDER_RESPONSE_REFERENCE"
  | QueueProviderPackageDiagnosticCode;
export type QueueProviderSdkBindingPreconditionArea =
  | "activation"
  | "auth"
  | "binding"
  | "dead_letter"
  | "driver"
  | "endpoint"
  | "idempotency"
  | "lease"
  | "observability"
  | "package"
  | "queue"
  | "retry"
  | "runbook";
export type QueueProviderSdkBindingHealthStatus = "local_ok" | "metadata_only" | "blocked";

export interface QueueProviderSdkBindingNoLiveFlags {
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

export interface QueueProviderSdkBindingProductionPrecondition {
  area: QueueProviderSdkBindingPreconditionArea;
  diagnosticCode: QueueProviderSdkBindingDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface QueueProviderSdkBindingDiagnostic {
  code: QueueProviderSdkBindingDiagnosticCode;
  field: string;
  message: string;
  severity: QueueProviderSdkBindingDiagnosticSeverity;
}

export interface QueueProviderSdkBindingOperationCapability {
  degradedOutcome: "blocked" | "manual_review" | "metadata_only" | "pending";
  liveEnabled: false;
  operation: QueueProviderSdkBindingOperation;
  operatorNextAction: string;
  requiredBeforeProduction: boolean;
  requiredConfigKeys: string[];
  supported: boolean;
}

export interface QueueProviderSdkBindingQueueRoute {
  jobIds: string[];
  queueId: string;
  requiredConfigKeys: string[];
  routeId: string;
}

export interface QueueProviderSdkBindingDeadLetterRoute {
  deadLetterQueueId: string;
  queueId: string;
  requiredConfigKeys: string[];
  routeId: string;
}

export interface QueueProviderSdkBindingHealthCheck {
  lastCheckedAt: string;
  liveProviderHealthCheckAttempted: false;
  sdkClientConstructionAttempted: false;
  status: QueueProviderSdkBindingHealthStatus;
}

export interface QueueProviderSdkPackageBindingSummary {
  bindingId: string;
  blockerCount: number;
  brokerConnectionPosture: QueueProviderBrokerConnectionPosture;
  browserBundleAllowed: false;
  diagnosticCodes: QueueProviderPackageDiagnosticCode[];
  family: QueueProviderPackageFamily;
  importPosture: QueueProviderPackageImportPosture;
  liveBrokerConnectionAttempted: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: QueueProviderPackageBindingMode;
  packageName: "bullmq";
  packageRef: "npm:bullmq";
  productionReady: false;
  providerKind: QueueProviderPackageProviderKind;
  requiredConfigKeys: string[];
  sdkClientConstructed: false;
  status: QueueProviderPackageBindingStatus;
  valid: boolean;
}

export interface QueueProviderSdkBindingReadinessProjection {
  activationGateSatisfied: boolean;
  bindingId: string;
  blockerCount: number;
  deadLetterRouteCount: number;
  diagnosticCodes: QueueProviderSdkBindingDiagnosticCode[];
  disabledLiveOperationCount: number;
  driverId: string;
  idempotencyStoreHandoffStatus: "deferred";
  liveProviderCallsEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: QueueProviderSdkBindingMode;
  observabilityExporterHandoffStatus: "deferred";
  operationCount: number;
  packageBinding: QueueProviderSdkPackageBindingSummary;
  packageBindingBlockerCount: number;
  packageBindingBrowserBundleAllowed: false;
  packageBindingDiagnosticCodes: QueueProviderPackageDiagnosticCode[];
  packageBindingFamily: QueueProviderPackageFamily;
  packageBindingId: string;
  packageBindingLiveBrokerConnectionAttempted: false;
  packageBindingLiveQueuePublishingEnabled: false;
  packageBindingLiveWorkerExecutionEnabled: false;
  packageBindingPackageName: "bullmq";
  packageBindingPackageRef: "npm:bullmq";
  packageBindingSdkClientConstructed: false;
  packageBindingStatus: QueueProviderPackageBindingStatus;
  productionReady: false;
  providerId: string;
  providerKind: QueueProviderSdkBindingProviderKind;
  queueRouteCount: number;
  requiredConfigKeys: string[];
  sdkClientConstructed: false;
  sdkPackageRef: string;
  status: QueueProviderSdkBindingFoundationStatus;
  valid: boolean;
  workerLeaseStoreHandoffStatus: "deferred";
}

export interface QueueProviderSdkBindingRegistration {
  activationGateSatisfied: boolean;
  bindingId: string;
  deadLetterRoutes: QueueProviderSdkBindingDeadLetterRoute[];
  driverId: string;
  healthCheck: QueueProviderSdkBindingHealthCheck;
  mode: QueueProviderSdkBindingMode;
  operationCapabilities: QueueProviderSdkBindingOperationCapability[];
  providerId: string;
  providerKind: QueueProviderSdkBindingProviderKind;
  queueRoutes: QueueProviderSdkBindingQueueRoute[];
  requiredConfigKeys: string[];
  sdkPackageRef: string;
  status: QueueProviderSdkBindingFoundationStatus;
}

export interface QueueProviderSdkBindingFoundationSummary extends QueueProviderSdkBindingRegistration {
  blockerCount: number;
  diagnosticCodes: QueueProviderSdkBindingDiagnosticCode[];
  diagnostics: QueueProviderSdkBindingDiagnostic[];
  id: "campaign-os-queue-provider-sdk-binding-foundation";
  liveProviderCallAttempted: false;
  noLiveFlags: QueueProviderSdkBindingNoLiveFlags;
  packageBinding: QueueProviderSdkPackageBindingSummary;
  preconditions: QueueProviderSdkBindingProductionPrecondition[];
  productionReady: false;
  profileId: QueueProviderSdkBindingProfileId;
  readiness: QueueProviderSdkBindingReadinessProjection;
  sdkClientConstructed: false;
  valid: boolean;
}

export interface CreateQueueProviderSdkBindingFoundationOptions {
  bindingId?: string;
  driverId?: string;
  env?: Record<string, unknown>;
  mode?: string;
  profileId?: string;
  providerId?: string;
  providerKind?: string;
  sdkPackageRef?: string;
}

export interface QueueProviderSdkOperationRequest {
  attempt: number;
  deadLetterReason?: string;
  idempotencyReference: string;
  jobId: string;
  operation: QueueProviderSdkBindingOperation;
  payloadReference: string;
  providerResponseReference?: string;
  queueId: string;
  requestedAt?: string;
  traceId: string;
}

export interface QueueProviderSdkOperationResult {
  accepted: boolean;
  bindingId: string;
  diagnosticCodes: QueueProviderSdkBindingDiagnosticCode[];
  diagnostics: QueueProviderSdkBindingDiagnostic[];
  driverId: string;
  idempotencyReference?: string;
  jobId?: string;
  liveProviderCallAttempted: false;
  livePublishAttempted: false;
  operation?: QueueProviderSdkBindingOperation;
  operationId?: string;
  payloadReference?: string;
  productionWriteAttempted: false;
  providerId: string;
  providerKind: QueueProviderSdkBindingProviderKind;
  providerResponseReference?: string;
  queueId?: string;
  requestedAt?: string;
  sdkClientConstructed: false;
  status: "accepted_local_stub" | "rejected" | "blocked_by_gate";
  traceId?: string;
}

export interface ExecuteLocalStubQueueProviderSdkOperationOptions {
  foundation?: QueueProviderSdkBindingFoundationSummary;
}

const FOUNDATION_ID = "campaign-os-queue-provider-sdk-binding-foundation" as const;
const REDACTED_VALUE = "[redacted]";
const RAW_SDK_PAYLOAD_VALUE = "[redacted-queue-provider-sdk-payload]";
const LOCAL_STUB_PROVIDER_ID = "local-stub";
const LOCAL_STUB_PROVIDER_KIND = "local-stub";
const LOCAL_STUB_BINDING_ID = "local-stub-queue-provider-sdk-binding";
const LOCAL_STUB_DRIVER_ID = "local-stub-queue-provider-driver";
const LOCAL_STUB_SDK_PACKAGE = "local-stub-sdk-package";
const METADATA_PROVIDER_ID = "metadata-only";
const METADATA_BINDING_ID = "metadata-only-queue-provider-sdk-binding";
const METADATA_DRIVER_ID = "metadata-only-queue-provider-driver";
const METADATA_SDK_PACKAGE = "metadata-only-sdk-package";
const PRODUCTION_PROVIDER_ID = "production-queue-provider";
const PRODUCTION_BINDING_ID = "production-provider-sdk-binding";
const PRODUCTION_DRIVER_ID = "production-provider-driver";
const PRODUCTION_SDK_PACKAGE = "package-ref:@provider/queue-sdk";
const HEALTH_CHECK_TIMESTAMP = "2026-07-08T00:00:00Z";
const MAX_LOCAL_STUB_ATTEMPT = 10;

export const SUPPORTED_QUEUE_PROVIDER_SDK_BINDING_PROFILES: QueueProviderSdkBindingProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const supportedQueueProviderSdkBindingProviderKinds: QueueProviderSdkBindingProviderKind[] = [
  "local-stub",
  "redis-compatible",
  "sqs-compatible",
  "pubsub-compatible",
  "rabbitmq-compatible",
  "cloud-tasks-compatible",
];

export const queueProviderSdkBindingNoLiveFlags: QueueProviderSdkBindingNoLiveFlags = {
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

export const queueProviderSdkBindingProductionPreconditions: QueueProviderSdkBindingProductionPrecondition[] = [
  precondition("package", "QUEUE_PROVIDER_SDK_PACKAGE_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE", "queue-provider-sdk-package-reference", "Queue provider SDK package/reference is required before live SDK binding."),
  precondition("binding", "QUEUE_PROVIDER_SDK_BINDING_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_BINDING", "queue-provider-sdk-binding-registration", "Queue provider SDK binding registration is required before live provider calls."),
  precondition("driver", "QUEUE_PROVIDER_DRIVER_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER", "queue-provider-sdk-driver-selection", "Queue provider driver selection is required before live SDK binding."),
  precondition("endpoint", "QUEUE_PROVIDER_SDK_ENDPOINT_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT", "queue-provider-sdk-endpoint-reference", "Queue provider endpoint reference is required before live SDK binding."),
  precondition("auth", "QUEUE_PROVIDER_SDK_CREDENTIALS_MISSING", "CAMPAIGN_OS_QUEUE_PROVIDER_CREDENTIALS", "queue-provider-sdk-credential-reference", "Queue provider credential reference is required before live provider calls."),
  precondition("queue", "QUEUE_PROVIDER_SDK_QUEUE_ROUTE_MISSING", "CAMPAIGN_OS_WORKER_QUEUE_URL", "queue-provider-sdk-worker-queue-route", "Worker queue route is required before live queue publishing."),
  precondition("dead_letter", "QUEUE_PROVIDER_SDK_DEAD_LETTER_ROUTE_MISSING", "CAMPAIGN_OS_DEAD_LETTER_QUEUE", "queue-provider-sdk-dead-letter-route", "Dead-letter route is required before live provider retry handling."),
  precondition("retry", "QUEUE_PROVIDER_SDK_RETRY_POLICY_MISSING", "CAMPAIGN_OS_WORKER_RETRY_POLICY", "queue-provider-sdk-retry-degradation-policy", "Retry and degradation policy is required before live retry handling.", ["CAMPAIGN_OS_WORKER_RETRY_POLICY", "CAMPAIGN_OS_DEGRADATION_POLICY"]),
  precondition("idempotency", "QUEUE_PROVIDER_SDK_IDEMPOTENCY_STORE_MISSING", "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL", "queue-provider-sdk-idempotency-store-handoff", "Idempotency store handoff is required before live queue publishing."),
  precondition("lease", "QUEUE_PROVIDER_SDK_WORKER_LEASE_MISSING", "CAMPAIGN_OS_WORKER_LEASE_STORE_URL", "queue-provider-sdk-worker-lease-store-handoff", "Worker lease store handoff is required before live worker/provider execution."),
  precondition("observability", "QUEUE_PROVIDER_SDK_OBSERVABILITY_MISSING", "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL", "queue-provider-sdk-observability-handoff", "Observability exporter handoff is required before production provider visibility.", undefined, "deferred"),
  precondition("runbook", "QUEUE_PROVIDER_SDK_RUNBOOK_MISSING", "CAMPAIGN_OS_OPERATOR_RUNBOOK_URL", "queue-provider-sdk-operator-runbook", "Operator runbook reference is required before live SDK binding activation.", undefined, "deferred"),
  precondition("activation", "QUEUE_PROVIDER_SDK_LIVE_ENABLEMENT_MISSING", "CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT", "queue-provider-sdk-live-enable-gate", "Explicit live queue enablement gate is required before live provider calls."),
];

export const queueProviderSdkBindingQueueRoutes: QueueProviderSdkBindingQueueRoute[] = [
  route("verification-route", "verification-jobs", ["task-verification-worker", "eligibility-refresh-worker"]),
  route("lifecycle-route", "lifecycle-jobs", ["campaign-lifecycle-worker"]),
  route("operations-route", "operations-jobs", ["export-preparation-worker", "stale-review-cleanup-worker"]),
  route("analytics-route", "analytics-jobs", ["analytics-ingestion-handoff-worker"]),
  route("ai-ops-route", "ai-ops-jobs", ["ai-ops-report-worker"]),
  route("contract-route", "contract-jobs", ["contract-sync-handoff-worker"]),
  route("reward-route", "reward-jobs", ["reward-distribution-handoff-worker"]),
];

export const queueProviderSdkBindingDeadLetterRoutes: QueueProviderSdkBindingDeadLetterRoute[] =
  queueProviderSdkBindingQueueRoutes.map((item) => ({
    deadLetterQueueId: `${item.queueId}-dead-letter`,
    queueId: item.queueId,
    requiredConfigKeys: ["CAMPAIGN_OS_DEAD_LETTER_QUEUE"],
    routeId: `${item.routeId}-dead-letter`,
  }));

export const queueProviderSdkBindingOperationCapabilities: QueueProviderSdkBindingOperationCapability[] = [
  capability("publish", true, true, ["CAMPAIGN_OS_WORKER_QUEUE_URL"], "pending"),
  capability("delayed_publish", true, true, ["CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT"], "metadata_only"),
  capability("ack", true, true, ["CAMPAIGN_OS_WORKER_QUEUE_URL"], "blocked"),
  capability("nack", true, true, ["CAMPAIGN_OS_WORKER_QUEUE_URL"], "manual_review"),
  capability("retry", true, true, ["CAMPAIGN_OS_WORKER_RETRY_POLICY"], "manual_review"),
  capability("dead_letter", true, true, ["CAMPAIGN_OS_DEAD_LETTER_QUEUE"], "manual_review"),
  capability("lease_handoff", true, true, ["CAMPAIGN_OS_WORKER_LEASE_STORE_URL"], "blocked"),
  capability("metrics", true, false, ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"], "metadata_only"),
];

export const createQueueProviderSdkBindingFoundation = (
  options: CreateQueueProviderSdkBindingFoundationOptions = {},
): QueueProviderSdkBindingFoundationSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const modeResolution = resolveMode(profileResolution.profileId, options.mode);
  const providerKindResolution = resolveProviderKind(options.providerKind, env, profileResolution.profileId);
  const providerResolution = resolveProviderId(options.providerId, env, profileResolution.profileId);
  const driverResolution = resolveDriverId(options.driverId, env, profileResolution.profileId, providerResolution.providerId);
  const bindingResolution = resolveBindingId(options.bindingId, env, profileResolution.profileId);
  const sdkPackageResolution = resolveSdkPackageRef(options.sdkPackageRef, env, profileResolution.profileId);
  const packageBindingFoundation = createQueueProviderPackageBinding({
    env,
    profileId: profileResolution.profileId,
  });
  const packageBinding = createPackageBindingSummary(packageBindingFoundation);
  const activationGateSatisfied = isActivationGateSatisfied(env);
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...modeResolution.diagnostics,
    ...providerKindResolution.diagnostics,
    ...providerResolution.diagnostics,
    ...driverResolution.diagnostics,
    ...bindingResolution.diagnostics,
    ...sdkPackageResolution.diagnostics,
    ...productionDiagnostics,
    ...packageBindingFoundation.diagnosticCodes.map((code) =>
      diagnostic(
        code,
        "queueProviderPackageBinding",
        `Queue provider package binding readiness reports ${code}.`,
      ),
    ),
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const status = resolveStatus(profileResolution.profileId, blockerCount);
  const valid =
    profileResolution.valid
    && modeResolution.valid
    && providerKindResolution.valid
    && providerResolution.valid
    && driverResolution.valid
    && bindingResolution.valid
    && sdkPackageResolution.valid
    && packageBinding.valid
    && blockerCount === 0;
  const registration = createRegistration({
    activationGateSatisfied,
    bindingId: bindingResolution.bindingId,
    driverId: driverResolution.driverId,
    healthCheck: createHealthCheck(status),
    mode: modeResolution.mode,
    providerId: providerResolution.providerId,
    providerKind: providerKindResolution.providerKind,
    sdkPackageRef: sdkPackageResolution.sdkPackageRef,
    status,
  });
  const readiness = createReadinessProjection({
    activationGateSatisfied,
    bindingId: bindingResolution.bindingId,
    blockerCount,
    diagnostics,
    driverId: driverResolution.driverId,
    mode: modeResolution.mode,
    packageBinding,
    providerId: providerResolution.providerId,
    providerKind: providerKindResolution.providerKind,
    sdkPackageRef: sdkPackageResolution.sdkPackageRef,
    status,
    valid,
  });

  return {
    ...registration,
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: FOUNDATION_ID,
    liveProviderCallAttempted: false,
    noLiveFlags: queueProviderSdkBindingNoLiveFlags,
    packageBinding,
    preconditions: queueProviderSdkBindingProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    readiness,
    sdkClientConstructed: false,
    valid,
  };
};

export const getQueueProviderSdkBindingRegistration = (
  bindingId: string = LOCAL_STUB_BINDING_ID,
): QueueProviderSdkBindingRegistration | undefined => {
  const binding = sanitizeQueueProviderSdkBindingString(bindingId);

  if (binding === LOCAL_STUB_BINDING_ID) {
    return createRegistration({
      activationGateSatisfied: false,
      bindingId: LOCAL_STUB_BINDING_ID,
      driverId: LOCAL_STUB_DRIVER_ID,
      healthCheck: createHealthCheck("local_ready"),
      mode: "dry_run",
      providerId: LOCAL_STUB_PROVIDER_ID,
      providerKind: LOCAL_STUB_PROVIDER_KIND,
      sdkPackageRef: LOCAL_STUB_SDK_PACKAGE,
      status: "local_ready",
    });
  }

  if (binding === METADATA_BINDING_ID) {
    return createRegistration({
      activationGateSatisfied: false,
      bindingId: METADATA_BINDING_ID,
      driverId: METADATA_DRIVER_ID,
      healthCheck: createHealthCheck("scaffolded"),
      mode: "metadata_only",
      providerId: METADATA_PROVIDER_ID,
      providerKind: "redis-compatible",
      sdkPackageRef: METADATA_SDK_PACKAGE,
      status: "scaffolded",
    });
  }

  if (binding === PRODUCTION_BINDING_ID) {
    return createRegistration({
      activationGateSatisfied: false,
      bindingId: PRODUCTION_BINDING_ID,
      driverId: PRODUCTION_DRIVER_ID,
      healthCheck: createHealthCheck("blocked"),
      mode: "production_required",
      providerId: PRODUCTION_PROVIDER_ID,
      providerKind: "sqs-compatible",
      sdkPackageRef: PRODUCTION_SDK_PACKAGE,
      status: "blocked",
    });
  }

  return undefined;
};

export const executeLocalStubQueueProviderSdkOperation = (
  request: QueueProviderSdkOperationRequest,
  options: ExecuteLocalStubQueueProviderSdkOperationOptions = {},
): QueueProviderSdkOperationResult => {
  const foundation = options.foundation ?? createQueueProviderSdkBindingFoundation({ profileId: "local-review" });

  if (foundation.status === "blocked") {
    return {
      accepted: false,
      bindingId: foundation.bindingId,
      diagnosticCodes: foundation.diagnosticCodes,
      diagnostics: foundation.diagnostics,
      driverId: foundation.driverId,
      liveProviderCallAttempted: false,
      livePublishAttempted: false,
      productionWriteAttempted: false,
      providerId: foundation.providerId,
      providerKind: foundation.providerKind,
      sdkClientConstructed: false,
      status: "blocked_by_gate",
    };
  }

  const diagnostics = validateOperationRequest(request);
  const accepted = diagnostics.length === 0;

  return {
    accepted,
    bindingId: foundation.bindingId,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    driverId: foundation.driverId,
    idempotencyReference: sanitizeQueueProviderSdkBindingString(request.idempotencyReference),
    jobId: sanitizeQueueProviderSdkBindingString(request.jobId),
    liveProviderCallAttempted: false,
    livePublishAttempted: false,
    operation: isQueueProviderSdkBindingOperation(request.operation) ? request.operation : undefined,
    operationId: accepted
      ? createOperationId(request.operation, request.queueId, request.jobId, request.attempt)
      : undefined,
    payloadReference: sanitizeQueueProviderSdkBindingString(request.payloadReference),
    productionWriteAttempted: false,
    providerId: foundation.providerId,
    providerKind: foundation.providerKind,
    providerResponseReference: request.providerResponseReference
      ? sanitizeQueueProviderSdkBindingString(request.providerResponseReference)
      : undefined,
    queueId: sanitizeQueueProviderSdkBindingString(request.queueId),
    requestedAt: request.requestedAt ? sanitizeQueueProviderSdkBindingString(request.requestedAt) : undefined,
    sdkClientConstructed: false,
    status: accepted ? "accepted_local_stub" : "rejected",
    traceId: sanitizeQueueProviderSdkBindingString(request.traceId),
  };
};

export const redactQueueProviderSdkBindingValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactQueueProviderSdkBindingValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveQueueProviderSdkBindingKey(key) && !isSafeSerializableQueueProviderSdkBindingKey(key, nestedValue)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactQueueProviderSdkBindingValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawQueueProviderSdkPayload(value)) {
    return RAW_SDK_PAYLOAD_VALUE;
  }

  if (isUnsafeQueueProviderSdkBindingString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

function precondition(
  area: QueueProviderSdkBindingPreconditionArea,
  diagnosticCode: QueueProviderSdkBindingDiagnosticCode,
  field: string,
  id: string,
  message: string,
  requiredConfigKeys = [field],
  status: QueueProviderSdkBindingProductionPrecondition["status"] = "blocked",
): QueueProviderSdkBindingProductionPrecondition {
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

function route(routeId: string, queueId: string, jobIds: string[]): QueueProviderSdkBindingQueueRoute {
  return {
    jobIds,
    queueId,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_QUEUE_URL"],
    routeId,
  };
}

function capability(
  operation: QueueProviderSdkBindingOperation,
  supported: boolean,
  requiredBeforeProduction: boolean,
  requiredConfigKeys: string[],
  degradedOutcome: QueueProviderSdkBindingOperationCapability["degradedOutcome"],
): QueueProviderSdkBindingOperationCapability {
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

function operationNextAction(operation: QueueProviderSdkBindingOperation): string {
  const labels: Record<QueueProviderSdkBindingOperation, string> = {
    ack: "Keep ack metadata local until provider SDK ack semantics are approved.",
    dead_letter: "Keep dead-letter SDK metadata local until a live dead-letter route is approved.",
    delayed_publish: "Keep delayed publish metadata local until provider scheduling SDK support is approved.",
    lease_handoff: "Keep lease handoff metadata local until worker lease execution is approved.",
    metrics: "Expose SDK metrics metadata only until live telemetry export is approved.",
    nack: "Keep nack metadata local until retry/degradation semantics are approved.",
    publish: "Use local stub publish metadata only; do not publish live queue messages.",
    retry: "Keep retry metadata local until retry policy and idempotency stores are approved.",
  };

  return labels[operation];
}

function createRegistration(input: {
  activationGateSatisfied: boolean;
  bindingId: string;
  driverId: string;
  healthCheck: QueueProviderSdkBindingHealthCheck;
  mode: QueueProviderSdkBindingMode;
  providerId: string;
  providerKind: QueueProviderSdkBindingProviderKind;
  sdkPackageRef: string;
  status: QueueProviderSdkBindingFoundationStatus;
}): QueueProviderSdkBindingRegistration {
  return {
    activationGateSatisfied: input.activationGateSatisfied,
    bindingId: input.bindingId,
    deadLetterRoutes: queueProviderSdkBindingDeadLetterRoutes.map((item) => ({ ...item })),
    driverId: input.driverId,
    healthCheck: input.healthCheck,
    mode: input.mode,
    operationCapabilities: queueProviderSdkBindingOperationCapabilities.map((item) => ({ ...item })),
    providerId: input.providerId,
    providerKind: input.providerKind,
    queueRoutes: queueProviderSdkBindingQueueRoutes.map((item) => ({ ...item, jobIds: [...item.jobIds] })),
    requiredConfigKeys: [
      ...new Set(queueProviderSdkBindingProductionPreconditions.flatMap((item) => item.requiredConfigKeys)),
    ],
    sdkPackageRef: input.sdkPackageRef,
    status: input.status,
  };
}

function createReadinessProjection(input: {
  activationGateSatisfied: boolean;
  bindingId: string;
  blockerCount: number;
  diagnostics: readonly QueueProviderSdkBindingDiagnostic[];
  driverId: string;
  mode: QueueProviderSdkBindingMode;
  packageBinding: QueueProviderSdkPackageBindingSummary;
  providerId: string;
  providerKind: QueueProviderSdkBindingProviderKind;
  sdkPackageRef: string;
  status: QueueProviderSdkBindingFoundationStatus;
  valid: boolean;
}): QueueProviderSdkBindingReadinessProjection {
  return {
    activationGateSatisfied: input.activationGateSatisfied,
    bindingId: input.bindingId,
    blockerCount: input.blockerCount,
    deadLetterRouteCount: queueProviderSdkBindingDeadLetterRoutes.length,
    diagnosticCodes: input.diagnostics.map((item) => item.code),
    disabledLiveOperationCount: queueProviderSdkBindingOperationCapabilities.length,
    driverId: input.driverId,
    idempotencyStoreHandoffStatus: "deferred",
    liveProviderCallsEnabled: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: input.mode,
    observabilityExporterHandoffStatus: "deferred",
    operationCount: queueProviderSdkBindingOperationCapabilities.length,
    packageBinding: clonePackageBindingSummary(input.packageBinding),
    packageBindingBlockerCount: input.packageBinding.blockerCount,
    packageBindingBrowserBundleAllowed: false,
    packageBindingDiagnosticCodes: [...input.packageBinding.diagnosticCodes],
    packageBindingFamily: input.packageBinding.family,
    packageBindingId: input.packageBinding.bindingId,
    packageBindingLiveBrokerConnectionAttempted: false,
    packageBindingLiveQueuePublishingEnabled: false,
    packageBindingLiveWorkerExecutionEnabled: false,
    packageBindingPackageName: input.packageBinding.packageName,
    packageBindingPackageRef: input.packageBinding.packageRef,
    packageBindingSdkClientConstructed: false,
    packageBindingStatus: input.packageBinding.status,
    productionReady: false,
    providerId: input.providerId,
    providerKind: input.providerKind,
    queueRouteCount: queueProviderSdkBindingQueueRoutes.length,
    requiredConfigKeys: [
      ...new Set([
        ...queueProviderSdkBindingProductionPreconditions.flatMap((item) => item.requiredConfigKeys),
        ...input.packageBinding.requiredConfigKeys,
      ]),
    ],
    sdkClientConstructed: false,
    sdkPackageRef: input.sdkPackageRef,
    status: input.status,
    valid: input.valid,
    workerLeaseStoreHandoffStatus: "deferred",
  };
}

function createPackageBindingSummary(
  packageBinding: ReturnType<typeof createQueueProviderPackageBinding>,
): QueueProviderSdkPackageBindingSummary {
  return {
    bindingId: packageBinding.bindingId,
    blockerCount: packageBinding.blockerCount,
    brokerConnectionPosture: packageBinding.brokerConnectionPosture,
    browserBundleAllowed: false,
    diagnosticCodes: [...packageBinding.diagnosticCodes],
    family: packageBinding.definition.family,
    importPosture: packageBinding.definition.importPosture,
    liveBrokerConnectionAttempted: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: packageBinding.mode,
    packageName: packageBinding.definition.packageName,
    packageRef: packageBinding.definition.packageRef,
    productionReady: false,
    providerKind: packageBinding.definition.providerKind,
    requiredConfigKeys: [...packageBinding.readiness.requiredConfigKeys],
    sdkClientConstructed: false,
    status: packageBinding.status,
    valid: packageBinding.valid,
  };
}

function clonePackageBindingSummary(
  packageBinding: QueueProviderSdkPackageBindingSummary,
): QueueProviderSdkPackageBindingSummary {
  return {
    ...packageBinding,
    diagnosticCodes: [...packageBinding.diagnosticCodes],
    requiredConfigKeys: [...packageBinding.requiredConfigKeys],
  };
}

function createHealthCheck(status: QueueProviderSdkBindingFoundationStatus): QueueProviderSdkBindingHealthCheck {
  return {
    lastCheckedAt: HEALTH_CHECK_TIMESTAMP,
    liveProviderHealthCheckAttempted: false,
    sdkClientConstructionAttempted: false,
    status: status === "local_ready" ? "local_ok" : status === "scaffolded" ? "metadata_only" : "blocked",
  };
}

function diagnostic(
  code: QueueProviderSdkBindingDiagnosticCode,
  field: string,
  message: string,
  severity: QueueProviderSdkBindingDiagnosticSeverity = "error",
): QueueProviderSdkBindingDiagnostic {
  return {
    code,
    field,
    message,
    severity,
  };
}

function resolveProfile(
  requestedProfileId: string | undefined,
): { diagnostics: QueueProviderSdkBindingDiagnostic[]; profileId: QueueProviderSdkBindingProfileId; valid: boolean } {
  const profileId = requestedProfileId ?? "local-review";

  if (isQueueProviderSdkBindingProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_QUEUE_PROVIDER_SDK_BINDING_PROFILE",
        "profileId",
        `Unsupported queue provider SDK binding profile: ${sanitizeQueueProviderSdkBindingString(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
}

function resolveMode(
  profileId: QueueProviderSdkBindingProfileId,
  requestedMode: string | undefined,
): { diagnostics: QueueProviderSdkBindingDiagnostic[]; mode: QueueProviderSdkBindingMode; valid: boolean } {
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

  if (isQueueProviderSdkBindingMode(requestedMode) && !isUnsafeQueueProviderSdkBindingString(requestedMode)) {
    return {
      diagnostics: [],
      mode: requestedMode,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_QUEUE_PROVIDER_SDK_BINDING_MODE",
        "mode",
        `Unsupported queue provider SDK binding mode: ${sanitizeQueueProviderSdkBindingString(requestedMode)}`,
      ),
    ],
    mode: "production_required",
    valid: false,
  };
}

function resolveProviderKind(
  requestedProviderKind: string | undefined,
  env: Record<string, unknown>,
  profileId: QueueProviderSdkBindingProfileId,
): { diagnostics: QueueProviderSdkBindingDiagnostic[]; providerKind: QueueProviderSdkBindingProviderKind; valid: boolean } {
  const envProviderKind = env.CAMPAIGN_OS_QUEUE_PROVIDER_KIND;
  const rawProviderKind =
    requestedProviderKind
    ?? (typeof envProviderKind === "string" && envProviderKind.trim().length > 0 ? envProviderKind : undefined)
    ?? (profileId === "staging-scaffold"
      ? "redis-compatible"
      : profileId === "production-required"
        ? "sqs-compatible"
        : LOCAL_STUB_PROVIDER_KIND);

  if (!isSafeLabel(rawProviderKind) || isUnsafeQueueProviderSdkBindingString(rawProviderKind)) {
    return {
      diagnostics: [
        diagnostic(
          "UNSAFE_QUEUE_PROVIDER_SDK_BINDING_CONFIG",
          "providerKind",
          "Queue provider SDK binding kind contains unsafe material.",
        ),
      ],
      providerKind: LOCAL_STUB_PROVIDER_KIND,
      valid: false,
    };
  }

  if (!isQueueProviderSdkBindingProviderKind(rawProviderKind)) {
    return {
      diagnostics: [
        diagnostic(
          "UNKNOWN_QUEUE_PROVIDER_SDK_BINDING_PROVIDER_KIND",
          "providerKind",
          `Queue provider SDK binding kind is not supported: ${sanitizeQueueProviderSdkBindingString(rawProviderKind)}`,
        ),
      ],
      providerKind: LOCAL_STUB_PROVIDER_KIND,
      valid: false,
    };
  }

  return {
    diagnostics: [],
    providerKind: rawProviderKind,
    valid: true,
  };
}

function resolveProviderId(
  requestedProviderId: string | undefined,
  env: Record<string, unknown>,
  profileId: QueueProviderSdkBindingProfileId,
): { diagnostics: QueueProviderSdkBindingDiagnostic[]; providerId: string; valid: boolean } {
  const envProvider = env.CAMPAIGN_OS_QUEUE_PROVIDER;
  const rawProviderId =
    requestedProviderId
    ?? (typeof envProvider === "string" && envProvider.trim().length > 0 ? envProvider : undefined)
    ?? (profileId === "staging-scaffold"
      ? METADATA_PROVIDER_ID
      : profileId === "production-required"
        ? PRODUCTION_PROVIDER_ID
        : LOCAL_STUB_PROVIDER_ID);

  if (!isSafeLabel(rawProviderId) || isUnsafeQueueProviderSdkBindingString(rawProviderId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_QUEUE_PROVIDER_SDK_BINDING_CONFIG", "providerId", "Queue provider id contains unsafe material."),
      ],
      providerId: "blocked-provider",
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
  profileId: QueueProviderSdkBindingProfileId,
  providerId: string,
): { diagnostics: QueueProviderSdkBindingDiagnostic[]; driverId: string; valid: boolean } {
  const envDriver = env.CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER;
  const rawDriverId =
    requestedDriverId
    ?? (typeof envDriver === "string" && envDriver.trim().length > 0 ? envDriver : undefined)
    ?? (profileId === "staging-scaffold"
      ? METADATA_DRIVER_ID
      : profileId === "production-required"
        ? PRODUCTION_DRIVER_ID
        : `${providerId}-queue-provider-driver`);

  if (!isSafeLabel(rawDriverId) || isUnsafeQueueProviderSdkBindingString(rawDriverId)) {
    return {
      diagnostics: [
        diagnostic("UNSAFE_QUEUE_PROVIDER_SDK_BINDING_CONFIG", "driverId", "Queue provider driver id contains unsafe material."),
      ],
      driverId: "blocked-driver",
      valid: false,
    };
  }

  return {
    diagnostics: [],
    driverId: rawDriverId,
    valid: true,
  };
}

function resolveBindingId(
  requestedBindingId: string | undefined,
  env: Record<string, unknown>,
  profileId: QueueProviderSdkBindingProfileId,
): { bindingId: string; diagnostics: QueueProviderSdkBindingDiagnostic[]; valid: boolean } {
  const envBinding = env.CAMPAIGN_OS_QUEUE_PROVIDER_BINDING;
  const rawBindingId =
    requestedBindingId
    ?? (typeof envBinding === "string" && envBinding.trim().length > 0 ? envBinding : undefined)
    ?? (profileId === "staging-scaffold"
      ? METADATA_BINDING_ID
      : profileId === "production-required"
        ? PRODUCTION_BINDING_ID
        : LOCAL_STUB_BINDING_ID);

  if (!isSafeLabel(rawBindingId) || isUnsafeQueueProviderSdkBindingString(rawBindingId)) {
    return {
      bindingId: "blocked-binding",
      diagnostics: [
        diagnostic("UNSAFE_QUEUE_PROVIDER_SDK_BINDING_CONFIG", "bindingId", "Queue provider SDK binding id contains unsafe material."),
      ],
      valid: false,
    };
  }

  if (!isSupportedBindingId(rawBindingId)) {
    return {
      bindingId: rawBindingId,
      diagnostics: [
        diagnostic(
          "QUEUE_PROVIDER_SDK_BINDING_UNSUPPORTED",
          "bindingId",
          `Queue provider SDK binding is not supported by this no-live registry: ${sanitizeQueueProviderSdkBindingString(rawBindingId)}`,
        ),
      ],
      valid: false,
    };
  }

  return {
    bindingId: rawBindingId,
    diagnostics: [],
    valid: true,
  };
}

function resolveSdkPackageRef(
  requestedSdkPackageRef: string | undefined,
  env: Record<string, unknown>,
  profileId: QueueProviderSdkBindingProfileId,
): { diagnostics: QueueProviderSdkBindingDiagnostic[]; sdkPackageRef: string; valid: boolean } {
  const envSdkPackage = env.CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE;
  const rawSdkPackageRef =
    requestedSdkPackageRef
    ?? (typeof envSdkPackage === "string" && envSdkPackage.trim().length > 0 ? envSdkPackage : undefined)
    ?? (profileId === "staging-scaffold"
      ? METADATA_SDK_PACKAGE
      : profileId === "production-required"
        ? PRODUCTION_SDK_PACKAGE
        : LOCAL_STUB_SDK_PACKAGE);

  if (!isSafePackageReference(rawSdkPackageRef) || isUnsafeQueueProviderSdkBindingString(rawSdkPackageRef)) {
    return {
      diagnostics: [
        diagnostic(
          "UNSAFE_QUEUE_PROVIDER_SDK_BINDING_CONFIG",
          "sdkPackageRef",
          "Queue provider SDK package reference contains unsafe material.",
        ),
      ],
      sdkPackageRef: "blocked-sdk-package",
      valid: false,
    };
  }

  if (!isSupportedSdkPackageRef(rawSdkPackageRef)) {
    return {
      diagnostics: [
        diagnostic(
          "QUEUE_PROVIDER_SDK_PACKAGE_UNSUPPORTED",
          "sdkPackageRef",
          `Queue provider SDK package reference is not supported by this no-live registry: ${sanitizeQueueProviderSdkBindingString(rawSdkPackageRef)}`,
        ),
      ],
      sdkPackageRef: rawSdkPackageRef,
      valid: false,
    };
  }

  return {
    diagnostics: [],
    sdkPackageRef: rawSdkPackageRef,
    valid: true,
  };
}

function createProductionDiagnostics(env: Record<string, unknown>): QueueProviderSdkBindingDiagnostic[] {
  return queueProviderSdkBindingProductionPreconditions
    .filter((item) => {
      if (item.diagnosticCode === "QUEUE_PROVIDER_SDK_LIVE_ENABLEMENT_MISSING") {
        return !isActivationGateSatisfied(env);
      }

      return !hasConfiguredValue(env, item.requiredConfigKeys);
    })
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));
}

function validateOperationRequest(request: QueueProviderSdkOperationRequest): QueueProviderSdkBindingDiagnostic[] {
  const diagnostics: QueueProviderSdkBindingDiagnostic[] = [];
  const route = queueProviderSdkBindingQueueRoutes.find((item) => item.queueId === request.queueId);

  if (!isQueueProviderSdkBindingOperation(request.operation)) {
    diagnostics.push(
      diagnostic("UNKNOWN_QUEUE_PROVIDER_OPERATION", "operation", "Queue provider SDK operation is not supported."),
    );
  }

  if (!route) {
    diagnostics.push(
      diagnostic("UNKNOWN_QUEUE_ID", "queueId", `Unknown queue id: ${sanitizeQueueProviderSdkBindingString(request.queueId)}`),
    );
  }

  if (!knownJobIds.has(request.jobId)) {
    diagnostics.push(
      diagnostic("UNKNOWN_QUEUE_JOB", "jobId", `Unknown queue job id: ${sanitizeQueueProviderSdkBindingString(request.jobId)}`),
    );
  } else if (route && !route.jobIds.includes(request.jobId)) {
    diagnostics.push(
      diagnostic(
        "MISMATCHED_QUEUE_JOB",
        "jobId",
        `Queue job ${sanitizeQueueProviderSdkBindingString(request.jobId)} does not belong to queue ${sanitizeQueueProviderSdkBindingString(request.queueId)}.`,
      ),
    );
  }

  if (!request.traceId.trim()) {
    diagnostics.push(
      diagnostic("MISSING_TRACE_ID", "traceId", "Trace id is required for queue provider SDK binding operation."),
    );
  }

  if (!Number.isInteger(request.attempt) || request.attempt < 1 || request.attempt > MAX_LOCAL_STUB_ATTEMPT) {
    diagnostics.push(
      diagnostic("INVALID_ATTEMPT", "attempt", `Queue provider SDK operation attempt must be 1-${MAX_LOCAL_STUB_ATTEMPT}.`),
    );
  }

  if (!request.payloadReference.trim()) {
    diagnostics.push(
      diagnostic("MISSING_PAYLOAD_REFERENCE", "payloadReference", "Payload reference is required for SDK operation."),
    );
  } else if (!isSafeReference(request.payloadReference) || isUnsafeQueueProviderSdkBindingString(request.payloadReference)) {
    diagnostics.push(
      diagnostic("UNSAFE_PAYLOAD_REFERENCE", "payloadReference", "Payload reference must not contain raw payload material."),
    );
  }

  if (!request.idempotencyReference.trim()) {
    diagnostics.push(
      diagnostic(
        "MISSING_IDEMPOTENCY_REFERENCE",
        "idempotencyReference",
        "Idempotency reference is required for SDK operation.",
      ),
    );
  } else if (
    !isSafeReference(request.idempotencyReference)
    || isUnsafeQueueProviderSdkBindingString(request.idempotencyReference)
  ) {
    diagnostics.push(
      diagnostic(
        "UNSAFE_IDEMPOTENCY_REFERENCE",
        "idempotencyReference",
        "Idempotency reference must not contain raw key material.",
      ),
    );
  }

  if (request.requestedAt && Number.isNaN(Date.parse(request.requestedAt))) {
    diagnostics.push(
      diagnostic("INVALID_PROVIDER_TIMESTAMP", "requestedAt", "Queue provider SDK operation timestamp is invalid."),
    );
  }

  if (
    request.deadLetterReason
    && (!isSafeReference(request.deadLetterReason) || isUnsafeQueueProviderSdkBindingString(request.deadLetterReason))
  ) {
    diagnostics.push(
      diagnostic("UNSAFE_DEAD_LETTER_REASON", "deadLetterReason", "Dead-letter reason reference is unsafe."),
    );
  }

  if (
    request.providerResponseReference
    && (!isSafeReference(request.providerResponseReference)
      || isUnsafeQueueProviderSdkBindingString(request.providerResponseReference))
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
  operation: QueueProviderSdkBindingOperation,
  queueId: string,
  jobId: string,
  attempt: number,
): string {
  return `local-stub:${operation}:${sanitizeQueueProviderSdkBindingString(queueId)}:${sanitizeQueueProviderSdkBindingString(jobId)}:attempt-${attempt}`;
}

const knownJobIds = new Set(queueProviderSdkBindingQueueRoutes.flatMap((item) => item.jobIds));

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
  profileId: QueueProviderSdkBindingProfileId,
  blockerCount: number,
): QueueProviderSdkBindingFoundationStatus {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "local-review" ? "local_ready" : "scaffolded";
}

function isQueueProviderSdkBindingProfileId(value: string): value is QueueProviderSdkBindingProfileId {
  return SUPPORTED_QUEUE_PROVIDER_SDK_BINDING_PROFILES.includes(value as QueueProviderSdkBindingProfileId);
}

function isQueueProviderSdkBindingMode(value: string): value is QueueProviderSdkBindingMode {
  return value === "dry_run" || value === "metadata_only" || value === "production_required";
}

function isQueueProviderSdkBindingProviderKind(value: string): value is QueueProviderSdkBindingProviderKind {
  return supportedQueueProviderSdkBindingProviderKinds.includes(value as QueueProviderSdkBindingProviderKind);
}

function isQueueProviderSdkBindingOperation(value: string): value is QueueProviderSdkBindingOperation {
  return queueProviderSdkBindingOperationCapabilities.some((item) => item.operation === value);
}

function isSupportedBindingId(value: string): boolean {
  return value === LOCAL_STUB_BINDING_ID || value === METADATA_BINDING_ID || value === PRODUCTION_BINDING_ID;
}

function isSupportedSdkPackageRef(value: string): boolean {
  return value === LOCAL_STUB_SDK_PACKAGE || value === METADATA_SDK_PACKAGE || value === PRODUCTION_SDK_PACKAGE;
}

function sanitizeQueueProviderSdkBindingString(value: string): string {
  const redacted = redactQueueProviderSdkBindingValue(value);

  if (typeof redacted !== "string") {
    return REDACTED_VALUE;
  }

  return redacted.slice(0, 160);
}

function isSafeReference(value: string): boolean {
  return /^[a-z0-9][a-z0-9@._:/-]{2,159}$/i.test(value) && !/[{}[\]"'\\]/.test(value);
}

function isSafeLabel(value: string): boolean {
  return /^[a-z0-9][a-z0-9._:-]{1,96}$/i.test(value);
}

function isSafePackageReference(value: string): boolean {
  return /^[a-z0-9@][a-z0-9@._:/-]{1,159}$/i.test(value) && !/[{}[\]"'\\]/.test(value);
}

function isSafeSerializableQueueProviderSdkBindingKey(key: string, value: unknown): boolean {
  return /^(bindingId|driverId|field|id|operation|providerId|providerKind|queueId|routeId|sdkPackageRef|status)$/i.test(key)
    && typeof value === "string"
    && !isUnsafeQueueProviderSdkBindingString(value);
}

function isSensitiveQueueProviderSdkBindingKey(key: string): boolean {
  return /api[_-]?key|auth|bearer|credential|endpoint|idempotency[_-]?key|lease[_-]?token|object[_-]?key|payload|provider[_-]?response|queue[_-]?credential|raw[_-]?json|secret|signed[_-]?url|token|wallet/i.test(key);
}

function isRawQueueProviderSdkPayload(value: string): boolean {
  const trimmed = value.trim();

  return trimmed.startsWith("{") || trimmed.startsWith("[") || /"payload"\s*:|raw-payload|provider-response-fragment/i.test(value);
}

function isUnsafeQueueProviderSdkBindingString(value: string): boolean {
  return /bearer\s+|api[_-]?key|credential|:\/\/[^/\s:]+:[^@\s]+@|private[_-]?key|queue-pass|queue-secret|secret|signed-url|signature=|token=|wallet|ELF_[A-Za-z0-9_]+/i.test(value)
    || isRawQueueProviderSdkPayload(value)
    || /exports\/|private-winners|provider-response-fragment|raw-payload/i.test(value);
}
