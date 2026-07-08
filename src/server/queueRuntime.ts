import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createObservabilityExporterFoundation,
  type ObservabilityExporterDiagnosticCode,
  type ObservabilityExporterFoundationStatus,
  type ObservabilityExporterMode,
  type ObservabilityExporterOperationCapability,
} from "./observabilityExporter";
import {
  createWorkerIdempotencyStoreFoundation,
  type WorkerIdempotencyDiagnosticCode,
  type WorkerIdempotencyOperationCapability,
  type WorkerIdempotencyStoreFoundationStatus,
  type WorkerIdempotencyStoreMode,
} from "./workerIdempotencyStore";
import {
  createQueueProviderAdapterFoundation,
  type QueueProviderAdapterFoundationStatus,
  type QueueProviderAdapterMode,
  type QueueProviderDiagnosticCode,
  type QueueProviderOperationCapability,
} from "./queueProviderAdapter";
import {
  executeLocalFakeQueueProviderOperation,
  type QueueProviderDriverDiagnosticCode,
  type QueueProviderDriverFoundationStatus,
  type QueueProviderDriverMode,
  type QueueProviderDriverOperationCapability,
  type QueueProviderDriverPublishAttemptPolicy,
  type QueueProviderDriverPublishPosture,
  type QueueProviderDriverPublishResultStatus,
  type QueueProviderDriverPublishingReadinessSummary,
  type QueueProviderDriverSdkBindingSummary,
  type QueueProviderOperationResult,
} from "./queueProviderDriver";
import {
  executeLocalStubQueueProviderSdkOperation,
  type QueueProviderSdkOperationResult,
} from "./queueProviderSdkBinding";
import {
  workerIdempotencyPolicies,
  workerJobCatalog,
  workerRetryBackoffPolicies,
  workerSchedulerPolicies,
  type WorkerJobDefinition,
  type WorkerJobFamily,
} from "./workerSchedulerRuntime";
import {
  createWorkerLeaseStoreFoundation,
  type WorkerLeaseDiagnosticCode,
  type WorkerLeaseOperationCapability,
  type WorkerLeaseStoreFoundationStatus,
  type WorkerLeaseStoreMode,
} from "./workerLeaseStore";

export type QueueRuntimeProfileId = BackendRuntimeProfileId;
export type QueueRuntimeFoundationStatus = "local_ready" | "scaffolded" | "blocked";
export type QueueCategory =
  | "verification"
  | "lifecycle"
  | "operations"
  | "analytics"
  | "ai"
  | "contract"
  | "reward";
export type QueuePriority = "critical" | "high" | "normal" | "low";
export type QueueDegradedOutcome =
  | "pending"
  | "manual_review"
  | "disable_provider_task_templates"
  | "metadata_only"
  | "blocked";
export type QueueRuntimeDiagnosticSeverity = "error" | "warning" | "info";
export type QueueRuntimeDiagnosticCode =
  | "UNKNOWN_QUEUE_RUNTIME_PROFILE"
  | "QUEUE_PROVIDER_MISSING"
  | "QUEUE_URL_MISSING"
  | "QUEUE_RETRY_POLICY_MISSING"
  | "QUEUE_IDEMPOTENCY_STORE_MISSING"
  | "QUEUE_WORKER_LEASE_MISSING"
  | "QUEUE_OBSERVABILITY_MISSING"
  | "QUEUE_PROVIDER_HANDOFF_MISSING"
  | "QUEUE_DEAD_LETTER_MISSING"
  | "UNKNOWN_QUEUE_JOB"
  | "UNKNOWN_QUEUE_ID"
  | "MISMATCHED_QUEUE_JOB"
  | "MISSING_TRACE_ID"
  | "INVALID_ATTEMPT"
  | "MISSING_IDEMPOTENCY_KEY"
  | "UNSAFE_IDEMPOTENCY_KEY"
  | "MISSING_PAYLOAD_REFERENCE"
  | "UNSAFE_PAYLOAD_REFERENCE"
  | "UNKNOWN_RETRY_POLICY"
  | "UNKNOWN_IDEMPOTENCY_POLICY";
export type QueueRuntimePreconditionArea =
  | "queue"
  | "retry"
  | "idempotency"
  | "lease"
  | "observability"
  | "provider"
  | "dead_letter";

export interface QueueRuntimeNoLiveFlags {
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

export interface QueueRuntimeProductionPrecondition {
  area: QueueRuntimePreconditionArea;
  diagnosticCode: QueueRuntimeDiagnosticCode;
  field: string;
  id: string;
  message: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface QueueRuntimeDiagnostic {
  code: QueueRuntimeDiagnosticCode;
  field: string;
  message: string;
  severity: QueueRuntimeDiagnosticSeverity;
}

export interface QueueRuntimeProviderAdapterSummary {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: QueueProviderDiagnosticCode[];
  disabledLiveOperationCount: number;
  driverActivationGateSatisfied: boolean;
  driverBlockerCount: number;
  driverDiagnosticCodes: QueueProviderDriverDiagnosticCode[];
  driverId: string;
  driverLiveQueuePublishingEnabled: false;
  driverLiveWorkerExecutionEnabled: false;
  driverMode: QueueProviderDriverMode;
  driverOperationCapabilities: QueueProviderDriverOperationCapability[];
  driverOperationCount: number;
  driverProductionReady: false;
  driverProviderId: string;
  driverPublishAttemptPolicy: QueueProviderDriverPublishAttemptPolicy;
  driverPublishDiagnosticCodes: QueueProviderDriverPublishPosture["diagnosticCodes"];
  driverPublishRequestEvaluated: boolean;
  driverPublishResultStatus: QueueProviderDriverPublishResultStatus;
  driverPublishingActivationStatus: QueueProviderDriverPublishingReadinessSummary["activationStatus"];
  driverPublishingBlockerCount: number;
  driverPublishingLivePublishAttempted: boolean;
  driverPublishingLiveQueuePublishingEnabled: boolean;
  driverPublishingNoLiveSideEffects: QueueProviderDriverPublishingReadinessSummary["noLiveSideEffects"];
  driverPublishingPublisherId: string;
  driverPublishingPublisherProvided: boolean;
  driverPublishingRequiredConfigKeys: string[];
  driverPublishingStatus: QueueProviderDriverPublishingReadinessSummary["status"];
  driverRequiredConfigKeys: string[];
  driverSdkBinding: QueueProviderDriverSdkBindingSummary;
  driverStatus: QueueProviderDriverFoundationStatus;
  driverValid: boolean;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: QueueProviderAdapterMode;
  operationCapabilities: QueueProviderOperationCapability[];
  operationCount: number;
  productionReady: false;
  providerId: string;
  requiredConfigKeys: string[];
  status: QueueProviderAdapterFoundationStatus;
  valid: boolean;
}

export interface QueueRuntimeLeaseStoreSummary {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: WorkerLeaseDiagnosticCode[];
  disabledLiveOperationCount: number;
  heartbeatIntervalSeconds: number;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: WorkerLeaseStoreMode;
  operationCapabilities: WorkerLeaseOperationCapability[];
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status: WorkerLeaseStoreFoundationStatus;
  storeId: string;
  ttlSeconds: number;
  valid: boolean;
}

export interface QueueRuntimeIdempotencyStoreSummary {
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
  operationCapabilities: WorkerIdempotencyOperationCapability[];
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status: WorkerIdempotencyStoreFoundationStatus;
  storeId: string;
  valid: boolean;
}

export interface QueueRuntimeObservabilityExporterSummary {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: ObservabilityExporterDiagnosticCode[];
  disabledLiveOperationCount: number;
  exporterId: string;
  liveAlertRoutingEnabled: false;
  liveLogExportEnabled: false;
  liveMetricsExportEnabled: false;
  liveTelemetryExportEnabled: false;
  liveTraceExportEnabled: false;
  metricNamespace: string;
  mode: ObservabilityExporterMode;
  operationCapabilities: ObservabilityExporterOperationCapability[];
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  sinkId: string;
  status: ObservabilityExporterFoundationStatus;
  valid: boolean;
}

export interface QueuePlan {
  deadLetterPolicy: string;
  degradedOutcome: QueueDegradedOutcome;
  id: string;
  idempotencyPolicyId: string;
  jobFamily: WorkerJobFamily;
  jobId: string;
  jobLabel: string;
  livePublishingEnabled: false;
  operatorNextAction: string;
  payloadReferencePolicy: string;
  priority: QueuePriority;
  queueCategory: QueueCategory;
  queueId: string;
  retryPolicyId: string;
  sideEffectBoundary: string;
}

export interface QueueRuntimeReadinessProjection {
  blockerCount: number;
  diagnosticCodes: QueueRuntimeDiagnosticCode[];
  dryRunEnqueueEnabled: boolean;
  idempotencyStoreBlockerCount: number;
  idempotencyStoreDiagnosticCodes: WorkerIdempotencyDiagnosticCode[];
  idempotencyStoreId: string;
  idempotencyStoreLiveIdempotencyExecutionEnabled: false;
  idempotencyStoreMode: WorkerIdempotencyStoreMode;
  idempotencyStoreNamespace: string;
  idempotencyStoreRequiredConfigKeys: string[];
  idempotencyStoreStatus: WorkerIdempotencyStoreFoundationStatus;
  leaseStoreBlockerCount: number;
  leaseStoreDiagnosticCodes: WorkerLeaseDiagnosticCode[];
  leaseStoreId: string;
  leaseStoreLiveQueuePublishingEnabled: false;
  leaseStoreLiveWorkerExecutionEnabled: false;
  leaseStoreMode: WorkerLeaseStoreMode;
  leaseStoreRequiredConfigKeys: string[];
  leaseStoreStatus: WorkerLeaseStoreFoundationStatus;
  liveQueuePublishingEnabled: false;
  observabilityExporterBlockerCount: number;
  observabilityExporterDiagnosticCodes: ObservabilityExporterDiagnosticCode[];
  observabilityExporterId: string;
  observabilityExporterLiveTelemetryExportEnabled: false;
  observabilityExporterMetricNamespace: string;
  observabilityExporterMode: ObservabilityExporterMode;
  observabilityExporterRequiredConfigKeys: string[];
  observabilityExporterSinkId: string;
  observabilityExporterStatus: ObservabilityExporterFoundationStatus;
  providerAdapterDriverBlockerCount: number;
  providerAdapterDriverDiagnosticCodes: QueueProviderDriverDiagnosticCode[];
  providerAdapterDriverId: string;
  providerAdapterDriverLiveQueuePublishingEnabled: false;
  providerAdapterDriverLiveWorkerExecutionEnabled: false;
  providerAdapterDriverMode: QueueProviderDriverMode;
  providerAdapterDriverOperationCount: number;
  providerAdapterDriverProductionReady: false;
  providerAdapterDriverProviderId: string;
  providerAdapterDriverPublishAttemptPolicy: QueueProviderDriverPublishAttemptPolicy;
  providerAdapterDriverPublishDiagnosticCodes: QueueProviderDriverPublishPosture["diagnosticCodes"];
  providerAdapterDriverPublishRequestEvaluated: boolean;
  providerAdapterDriverPublishResultStatus: QueueProviderDriverPublishResultStatus;
  providerAdapterDriverPublishingActivationStatus: QueueProviderDriverPublishingReadinessSummary["activationStatus"];
  providerAdapterDriverPublishingBlockerCount: number;
  providerAdapterDriverPublishingLivePublishAttempted: boolean;
  providerAdapterDriverPublishingLiveQueuePublishingEnabled: boolean;
  providerAdapterDriverPublishingNoLiveSideEffects: QueueProviderDriverPublishingReadinessSummary["noLiveSideEffects"];
  providerAdapterDriverPublishingPublisherId: string;
  providerAdapterDriverPublishingPublisherProvided: boolean;
  providerAdapterDriverPublishingRequiredConfigKeys: string[];
  providerAdapterDriverPublishingStatus: QueueProviderDriverPublishingReadinessSummary["status"];
  providerAdapterDriverRequiredConfigKeys: string[];
  providerAdapterDriverStatus: QueueProviderDriverFoundationStatus;
  providerAdapterDriverValid: boolean;
  providerAdapterDriverSdkBindingActivationGateSatisfied: boolean;
  providerAdapterDriverSdkBindingBlockerCount: number;
  providerAdapterDriverSdkBindingDiagnosticCodes: QueueProviderDriverSdkBindingSummary["diagnosticCodes"];
  providerAdapterDriverSdkBindingDisabledLiveOperationCount: number;
  providerAdapterDriverSdkBindingId: string;
  providerAdapterDriverSdkBindingLiveProviderCallAttempted: false;
  providerAdapterDriverSdkBindingLiveQueuePublishingEnabled: false;
  providerAdapterDriverSdkBindingLiveWorkerExecutionEnabled: false;
  providerAdapterDriverSdkBindingMode: QueueProviderDriverSdkBindingSummary["mode"];
  providerAdapterDriverSdkBindingOperationCount: number;
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionBlockerCount: number;
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: QueueProviderDriverSdkBindingSummary["packageBinding"]["brokerConnectionDiagnosticCodes"];
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: QueueProviderDriverSdkBindingSummary["packageBinding"]["brokerConnectionHealthCheckMode"];
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionId: string;
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: string[];
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionStatus: QueueProviderDriverSdkBindingSummary["packageBinding"]["brokerConnectionStatus"];
  providerAdapterDriverSdkBindingPackageBindingBlockerCount: number;
  providerAdapterDriverSdkBindingPackageBindingBrowserBundleAllowed: false;
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionAttempted: boolean;
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionBlockerCount: number;
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: QueueProviderDriverSdkBindingSummary["packageBinding"]["bullmqConstructionDiagnosticCodes"];
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: boolean;
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionId: string;
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionProductionReady: false;
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionStatus: QueueProviderDriverSdkBindingSummary["packageBinding"]["bullmqConstructionStatus"];
  providerAdapterDriverSdkBindingPackageBindingDiagnosticCodes: QueueProviderDriverSdkBindingSummary["packageBinding"]["diagnosticCodes"];
  providerAdapterDriverSdkBindingPackageBindingFamily: QueueProviderDriverSdkBindingSummary["packageBinding"]["family"];
  providerAdapterDriverSdkBindingPackageBindingId: string;
  providerAdapterDriverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false;
  providerAdapterDriverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false;
  providerAdapterDriverSdkBindingPackageBindingLiveQueuePublishingEnabled: false;
  providerAdapterDriverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false;
  providerAdapterDriverSdkBindingPackageBindingPackageName: "bullmq";
  providerAdapterDriverSdkBindingPackageBindingPackageRef: "npm:bullmq";
  providerAdapterDriverSdkBindingPackageBindingQueueClientConstructed: boolean;
  providerAdapterDriverSdkBindingPackageBindingQueueEventsConstructed: boolean;
  providerAdapterDriverSdkBindingPackageBindingSdkClientConstructed: false;
  providerAdapterDriverSdkBindingPackageBindingStatus: QueueProviderDriverSdkBindingSummary["packageBinding"]["status"];
  providerAdapterDriverSdkBindingPackageBindingWorkerConstructed: boolean;
  providerAdapterDriverSdkBindingProductionReady: false;
  providerAdapterDriverSdkBindingProviderKind: QueueProviderDriverSdkBindingSummary["providerKind"];
  providerAdapterDriverSdkBindingQueueRouteCount: number;
  providerAdapterDriverSdkBindingRequiredConfigKeys: string[];
  providerAdapterDriverSdkBindingSdkClientConstructed: false;
  providerAdapterDriverSdkBindingSdkPackageRef: string;
  providerAdapterDriverSdkBindingStatus: QueueProviderDriverSdkBindingSummary["status"];
  providerAdapterDriverSdkBindingValid: boolean;
  providerAdapterBlockerCount: number;
  providerAdapterDiagnosticCodes: QueueProviderDiagnosticCode[];
  providerAdapterId: string;
  providerAdapterMode: QueueProviderAdapterMode;
  providerAdapterStatus: QueueProviderAdapterFoundationStatus;
  providerId: string;
  providerRequiredConfigKeys: string[];
  productionReady: false;
  queueCategoryCount: number;
  queueIds: string[];
  queuePlanCount: number;
}

export interface QueueRuntimeFoundationSummary {
  blockerCount: number;
  diagnosticCodes: QueueRuntimeDiagnosticCode[];
  diagnostics: QueueRuntimeDiagnostic[];
  id: "campaign-os-queue-runtime-foundation";
  idempotencyStore: QueueRuntimeIdempotencyStoreSummary;
  leaseStore: QueueRuntimeLeaseStoreSummary;
  noLiveFlags: QueueRuntimeNoLiveFlags;
  observabilityExporter: QueueRuntimeObservabilityExporterSummary;
  preconditions: QueueRuntimeProductionPrecondition[];
  productionReady: false;
  profileId: QueueRuntimeProfileId;
  providerAdapter: QueueRuntimeProviderAdapterSummary;
  queuePlans: QueuePlan[];
  readiness: QueueRuntimeReadinessProjection;
  status: QueueRuntimeFoundationStatus;
  valid: boolean;
}

export interface CreateQueueRuntimeFoundationOptions {
  env?: Record<string, unknown>;
  profileId?: string;
  providerId?: string;
}

export interface QueueEnqueueRequest {
  attempt: number;
  idempotencyKey: string;
  jobId: string;
  payloadReference: string;
  queueId: string;
  requestedAt?: string;
  traceId: string;
}

export interface QueueEnqueueResult {
  accepted: boolean;
  attempt?: number;
  degradedOutcome: QueueDegradedOutcome;
  diagnosticCodes: QueueRuntimeDiagnosticCode[];
  diagnostics: QueueRuntimeDiagnostic[];
  idempotencyKey?: string;
  jobId?: string;
  livePublishAttempted: false;
  liveQueuePublishingEnabled: false;
  payloadReference?: string;
  providerDriverOperation?: QueueProviderOperationResult;
  providerSdkBindingOperation?: QueueProviderSdkOperationResult;
  queueId?: string;
  requestedAt?: string;
  status: "accepted_dry_run" | "rejected";
  traceId?: string;
}

type QueuePlanMetadata = Pick<
  QueuePlan,
  "degradedOutcome" | "operatorNextAction" | "priority" | "queueCategory" | "queueId"
>;

const REDACTED_VALUE = "[redacted]";
const RAW_JOB_PAYLOAD_VALUE = "[redacted-job-payload]";

export const SUPPORTED_QUEUE_RUNTIME_PROFILES: QueueRuntimeProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const queueRuntimeNoLiveFlags: QueueRuntimeNoLiveFlags = {
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

export const queueRuntimeProductionPreconditions: QueueRuntimeProductionPrecondition[] = [
  {
    area: "queue",
    diagnosticCode: "QUEUE_PROVIDER_MISSING",
    field: "CAMPAIGN_OS_QUEUE_PROVIDER",
    id: "queue-provider",
    message: "Queue provider selection is required before live queue publishing.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_QUEUE_PROVIDER"],
    status: "blocked",
  },
  {
    area: "queue",
    diagnosticCode: "QUEUE_URL_MISSING",
    field: "CAMPAIGN_OS_WORKER_QUEUE_URL",
    id: "worker-queue-url",
    message: "Worker queue URL is required before live worker queue publishing.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_QUEUE_URL"],
    status: "blocked",
  },
  {
    area: "retry",
    diagnosticCode: "QUEUE_RETRY_POLICY_MISSING",
    field: "CAMPAIGN_OS_WORKER_RETRY_POLICY",
    id: "queue-retry-policy",
    message: "Retry/backoff policy must be configured before live queue retries.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_RETRY_POLICY"],
    status: "blocked",
  },
  {
    area: "idempotency",
    diagnosticCode: "QUEUE_IDEMPOTENCY_STORE_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
    id: "queue-idempotency-store",
    message: "Idempotency store is required before side-effecting queue workers execute.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_STORE_URL"],
    status: "blocked",
  },
  {
    area: "lease",
    diagnosticCode: "QUEUE_WORKER_LEASE_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
    id: "queue-worker-lease",
    message: "Worker lease store is required before concurrent live worker execution.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_STORE_URL"],
    status: "blocked",
  },
  {
    area: "observability",
    diagnosticCode: "QUEUE_OBSERVABILITY_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
    id: "queue-observability",
    message: "Observability exporter is required before production queue visibility.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"],
    status: "deferred",
  },
  {
    area: "provider",
    diagnosticCode: "QUEUE_PROVIDER_HANDOFF_MISSING",
    field: "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
    id: "queue-provider-handoff",
    message: "Provider handoff must be configured before provider-backed queue jobs execute.",
    requiredBeforeProduction: true,
    requiredConfigKeys: [
      "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
      "CAMPAIGN_OS_DEGRADATION_POLICY",
    ],
    status: "deferred",
  },
  {
    area: "dead_letter",
    diagnosticCode: "QUEUE_DEAD_LETTER_MISSING",
    field: "CAMPAIGN_OS_DEAD_LETTER_QUEUE",
    id: "queue-dead-letter",
    message: "Dead-letter queue handling is required before live queue retry failures.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_DEAD_LETTER_QUEUE"],
    status: "blocked",
  },
];

const queuePlanMetadata = {
  task_verification: {
    degradedOutcome: "pending",
    operatorNextAction: "Keep verification pending or route to manual review until worker queue is live.",
    priority: "high",
    queueCategory: "verification",
    queueId: "verification-jobs",
  },
  campaign_lifecycle: {
    degradedOutcome: "blocked",
    operatorNextAction: "Use operator review; do not mutate campaign lifecycle from a dry-run queue plan.",
    priority: "critical",
    queueCategory: "lifecycle",
    queueId: "lifecycle-jobs",
  },
  eligibility_refresh: {
    degradedOutcome: "metadata_only",
    operatorNextAction: "Keep eligibility projection stale-safe until idempotent worker execution is live.",
    priority: "normal",
    queueCategory: "verification",
    queueId: "verification-jobs",
  },
  export_preparation: {
    degradedOutcome: "manual_review",
    operatorNextAction: "Prepare export through operator review; do not write storage-backed artifacts.",
    priority: "high",
    queueCategory: "operations",
    queueId: "operations-jobs",
  },
  analytics_ingestion_handoff: {
    degradedOutcome: "metadata_only",
    operatorNextAction: "Keep analytics as local projections until warehouse ingestion is approved.",
    priority: "low",
    queueCategory: "analytics",
    queueId: "analytics-jobs",
  },
  ai_ops_report: {
    degradedOutcome: "metadata_only",
    operatorNextAction: "Keep AI Ops report handoff as metadata; do not call AI providers.",
    priority: "low",
    queueCategory: "ai",
    queueId: "ai-ops-jobs",
  },
  stale_review_cleanup: {
    degradedOutcome: "manual_review",
    operatorNextAction: "Use operator review for stale review cleanup until live scheduler and lease exist.",
    priority: "normal",
    queueCategory: "operations",
    queueId: "operations-jobs",
  },
  contract_sync_handoff: {
    degradedOutcome: "blocked",
    operatorNextAction: "Block live contract sync until contract reader/writer approval and queue controls exist.",
    priority: "high",
    queueCategory: "contract",
    queueId: "contract-jobs",
  },
  reward_distribution_handoff: {
    degradedOutcome: "manual_review",
    operatorNextAction: "Require reward custody and distribution review before any reward handoff executes.",
    priority: "critical",
    queueCategory: "reward",
    queueId: "reward-jobs",
  },
} as const satisfies Record<WorkerJobFamily, QueuePlanMetadata>;

const retryPolicyById = new Map(workerRetryBackoffPolicies.map((policy) => [policy.id, policy]));
const idempotencyPolicyById = new Map(workerIdempotencyPolicies.map((policy) => [policy.id, policy]));
const schedulerPolicyByJobId = new Map(workerSchedulerPolicies.map((policy) => [policy.jobId, policy]));

const diagnostic = (
  code: QueueRuntimeDiagnosticCode,
  field: string,
  message: string,
  severity: QueueRuntimeDiagnosticSeverity = "error",
): QueueRuntimeDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const plan = (job: WorkerJobDefinition): QueuePlan => {
  const schedulerPolicy = schedulerPolicyByJobId.get(job.id);
  const metadata = queuePlanMetadata[job.family];

  return {
    deadLetterPolicy: "deferred-dead-letter-review-required",
    degradedOutcome: metadata.degradedOutcome,
    id: `${job.id}-queue-plan`,
    idempotencyPolicyId: schedulerPolicy?.idempotencyPolicyId ?? "missing-idempotency-policy",
    jobFamily: job.family,
    jobId: job.id,
    jobLabel: job.label,
    livePublishingEnabled: false,
    operatorNextAction: metadata.operatorNextAction,
    payloadReferencePolicy: "payload-reference-or-hash-only-no-raw-payload",
    priority: metadata.priority,
    queueCategory: metadata.queueCategory,
    queueId: metadata.queueId,
    retryPolicyId: schedulerPolicy?.retryPolicyId ?? "missing-retry-policy",
    sideEffectBoundary: job.sideEffectBoundary,
  };
};

export const queueRuntimePlans: QueuePlan[] = workerJobCatalog.map(plan);

const knownQueueJobIds = new Set(queueRuntimePlans.map((item) => item.jobId));
const knownQueueIds = new Set(queueRuntimePlans.map((item) => item.queueId));
const queuePlanByJobId = new Map(queueRuntimePlans.map((item) => [item.jobId, item]));

const hasConfiguredValue = (env: Record<string, unknown>, keys: readonly string[]): boolean =>
  keys.every((key) => {
    const value = env[key];

    return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
  });

const isQueueRuntimeProfileId = (value: string): value is QueueRuntimeProfileId =>
  SUPPORTED_QUEUE_RUNTIME_PROFILES.includes(value as QueueRuntimeProfileId);

const resolveProfile = (
  requestedProfileId: string | undefined,
): { diagnostics: QueueRuntimeDiagnostic[]; profileId: QueueRuntimeProfileId; valid: boolean } => {
  const profileId = requestedProfileId ?? "local-review";

  if (isQueueRuntimeProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_QUEUE_RUNTIME_PROFILE",
        "profileId",
        `Unsupported queue runtime profile: ${sanitizeQueueRuntimeString(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
};

const createProductionDiagnostics = (
  env: Record<string, unknown>,
): QueueRuntimeDiagnostic[] =>
  queueRuntimeProductionPreconditions
    .filter((item) => !hasConfiguredValue(env, item.requiredConfigKeys))
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));

const createRegistryDiagnostics = (): QueueRuntimeDiagnostic[] =>
  queueRuntimePlans.flatMap((queuePlan) => {
    const diagnostics: QueueRuntimeDiagnostic[] = [];

    if (!retryPolicyById.has(queuePlan.retryPolicyId)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_RETRY_POLICY",
          "retryPolicyId",
          `Unknown queue retry policy id: ${sanitizeQueueRuntimeString(queuePlan.retryPolicyId)}`,
        ),
      );
    }

    if (!idempotencyPolicyById.has(queuePlan.idempotencyPolicyId)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_IDEMPOTENCY_POLICY",
          "idempotencyPolicyId",
          `Unknown queue idempotency policy id: ${sanitizeQueueRuntimeString(queuePlan.idempotencyPolicyId)}`,
        ),
      );
    }

    return diagnostics;
  });

export const createQueueRuntimeFoundation = (
  options: CreateQueueRuntimeFoundationOptions = {},
): QueueRuntimeFoundationSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const registryDiagnostics = createRegistryDiagnostics();
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const providerAdapterFoundation = createQueueProviderAdapterFoundation({
    env,
    profileId: profileResolution.profileId,
    providerId: options.providerId,
  });
  const providerAdapter = createProviderAdapterSummary(providerAdapterFoundation);
  const leaseStore = createLeaseStoreSummary(
    createWorkerLeaseStoreFoundation({
      env,
      profileId: profileResolution.profileId,
    }),
  );
  const idempotencyStore = createIdempotencyStoreSummary(
    createWorkerIdempotencyStoreFoundation({
      env,
      profileId: profileResolution.profileId,
    }),
  );
  const observabilityExporter = createObservabilityExporterSummary(
    createObservabilityExporterFoundation({
      env,
      profileId: profileResolution.profileId,
    }),
  );
  const diagnostics = [
    ...profileResolution.diagnostics,
    ...registryDiagnostics,
    ...productionDiagnostics,
  ];
  const blockerCount = diagnostics.filter((item) => item.severity === "error").length;
  const status = resolveStatus(profileResolution.profileId, blockerCount);
  const readiness = createReadinessProjection(
    diagnostics,
    blockerCount,
    providerAdapter,
    leaseStore,
    idempotencyStore,
    observabilityExporter,
  );

  return {
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: "campaign-os-queue-runtime-foundation",
    idempotencyStore,
    leaseStore,
    noLiveFlags: queueRuntimeNoLiveFlags,
    observabilityExporter,
    preconditions: queueRuntimeProductionPreconditions.map((item) => ({ ...item })),
    productionReady: false,
    profileId: profileResolution.profileId,
    providerAdapter,
    queuePlans: queueRuntimePlans.map((item) => ({ ...item })),
    readiness,
    status,
    valid: profileResolution.valid && blockerCount === 0,
  };
};

export const dryRunQueueEnqueue = (
  request: QueueEnqueueRequest,
): QueueEnqueueResult => {
  const queuePlan = queuePlanByJobId.get(request.jobId);
  const retryPolicy = queuePlan ? retryPolicyById.get(queuePlan.retryPolicyId) : undefined;
  const diagnostics = validateEnqueueRequest(request, queuePlan, retryPolicy?.maxAttempts);
  const accepted = diagnostics.length === 0;
  const providerDriverOperation = executeLocalFakeQueueProviderOperation({
    attempt: request.attempt,
    idempotencyKey: request.idempotencyKey,
    jobId: request.jobId,
    operation: "publish",
    payloadReference: request.payloadReference,
    queueId: request.queueId,
    requestedAt: request.requestedAt,
    traceId: request.traceId,
  });
  const providerSdkBindingOperation = executeLocalStubQueueProviderSdkOperation({
    attempt: request.attempt,
    idempotencyReference: request.idempotencyKey,
    jobId: request.jobId,
    operation: "publish",
    payloadReference: request.payloadReference,
    queueId: request.queueId,
    requestedAt: request.requestedAt,
    traceId: request.traceId,
  });

  return {
    accepted,
    attempt: Number.isInteger(request.attempt) ? request.attempt : undefined,
    degradedOutcome: queuePlan?.degradedOutcome ?? "blocked",
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    idempotencyKey: sanitizeQueueRuntimeString(request.idempotencyKey),
    jobId: sanitizeQueueRuntimeString(request.jobId),
    livePublishAttempted: false,
    liveQueuePublishingEnabled: false,
    payloadReference: sanitizeQueueRuntimeString(request.payloadReference),
    providerDriverOperation,
    providerSdkBindingOperation,
    queueId: sanitizeQueueRuntimeString(request.queueId),
    requestedAt: request.requestedAt ? sanitizeQueueRuntimeString(request.requestedAt) : undefined,
    status: accepted ? "accepted_dry_run" : "rejected",
    traceId: sanitizeQueueRuntimeString(request.traceId),
  };
};

export const redactQueueRuntimeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactQueueRuntimeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveQueueRuntimeKey(key) && !isSafeSerializableQueueKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactQueueRuntimeValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawJobPayload(value)) {
    return RAW_JOB_PAYLOAD_VALUE;
  }

  if (isUnsafeQueueRuntimeString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

const validateEnqueueRequest = (
  request: QueueEnqueueRequest,
  queuePlan: QueuePlan | undefined,
  maxAttempts: number | undefined,
): QueueRuntimeDiagnostic[] => {
  const diagnostics: QueueRuntimeDiagnostic[] = [];

  if (!knownQueueJobIds.has(request.jobId)) {
    diagnostics.push(
      diagnostic("UNKNOWN_QUEUE_JOB", "jobId", `Unknown queue job id: ${sanitizeQueueRuntimeString(request.jobId)}`),
    );
  }

  if (!knownQueueIds.has(request.queueId)) {
    diagnostics.push(
      diagnostic("UNKNOWN_QUEUE_ID", "queueId", `Unknown queue id: ${sanitizeQueueRuntimeString(request.queueId)}`),
    );
  }

  if (queuePlan && request.queueId !== queuePlan.queueId) {
    diagnostics.push(
      diagnostic(
        "MISMATCHED_QUEUE_JOB",
        "queueId",
        `Queue id ${sanitizeQueueRuntimeString(request.queueId)} does not match job ${queuePlan.jobId}.`,
      ),
    );
  }

  if (!request.traceId.trim()) {
    diagnostics.push(diagnostic("MISSING_TRACE_ID", "traceId", "Trace id is required for queue enqueue dry-run."));
  }

  if (
    !Number.isInteger(request.attempt)
    || request.attempt < 1
    || (maxAttempts !== undefined && request.attempt > maxAttempts)
  ) {
    diagnostics.push(
      diagnostic(
        "INVALID_ATTEMPT",
        "attempt",
        `Queue enqueue attempt must be an integer from 1 to ${maxAttempts ?? "the retry policy limit"}.`,
      ),
    );
  }

  if (!request.idempotencyKey.trim()) {
    diagnostics.push(
      diagnostic("MISSING_IDEMPOTENCY_KEY", "idempotencyKey", "Idempotency key is required for queue enqueue dry-run."),
    );
  } else if (isUnsafeQueueRuntimeString(request.idempotencyKey)) {
    diagnostics.push(
      diagnostic("UNSAFE_IDEMPOTENCY_KEY", "idempotencyKey", "Idempotency key contains unsafe serialized material."),
    );
  }

  if (!request.payloadReference.trim()) {
    diagnostics.push(
      diagnostic("MISSING_PAYLOAD_REFERENCE", "payloadReference", "Payload reference is required for queue enqueue dry-run."),
    );
  } else if (isUnsafeQueueRuntimeString(request.payloadReference) || isRawJobPayload(request.payloadReference)) {
    diagnostics.push(
      diagnostic("UNSAFE_PAYLOAD_REFERENCE", "payloadReference", "Payload reference must not contain raw payload material."),
    );
  }

  return diagnostics;
};

const createReadinessProjection = (
  diagnostics: readonly QueueRuntimeDiagnostic[],
  blockerCount: number,
  providerAdapter: QueueRuntimeProviderAdapterSummary,
  leaseStore: QueueRuntimeLeaseStoreSummary,
  idempotencyStore: QueueRuntimeIdempotencyStoreSummary,
  observabilityExporter: QueueRuntimeObservabilityExporterSummary,
): QueueRuntimeReadinessProjection => ({
  blockerCount,
  diagnosticCodes: diagnostics.map((item) => item.code),
  dryRunEnqueueEnabled: blockerCount === 0,
  idempotencyStoreBlockerCount: idempotencyStore.blockerCount,
  idempotencyStoreDiagnosticCodes: idempotencyStore.diagnosticCodes,
  idempotencyStoreId: idempotencyStore.storeId,
  idempotencyStoreLiveIdempotencyExecutionEnabled: false,
  idempotencyStoreMode: idempotencyStore.mode,
  idempotencyStoreNamespace: idempotencyStore.namespace,
  idempotencyStoreRequiredConfigKeys: idempotencyStore.requiredConfigKeys,
  idempotencyStoreStatus: idempotencyStore.status,
  leaseStoreBlockerCount: leaseStore.blockerCount,
  leaseStoreDiagnosticCodes: leaseStore.diagnosticCodes,
  leaseStoreId: leaseStore.storeId,
  leaseStoreLiveQueuePublishingEnabled: false,
  leaseStoreLiveWorkerExecutionEnabled: false,
  leaseStoreMode: leaseStore.mode,
  leaseStoreRequiredConfigKeys: leaseStore.requiredConfigKeys,
  leaseStoreStatus: leaseStore.status,
  liveQueuePublishingEnabled: false,
  observabilityExporterBlockerCount: observabilityExporter.blockerCount,
  observabilityExporterDiagnosticCodes: observabilityExporter.diagnosticCodes,
  observabilityExporterId: observabilityExporter.exporterId,
  observabilityExporterLiveTelemetryExportEnabled: false,
  observabilityExporterMetricNamespace: observabilityExporter.metricNamespace,
  observabilityExporterMode: observabilityExporter.mode,
  observabilityExporterRequiredConfigKeys: observabilityExporter.requiredConfigKeys,
  observabilityExporterSinkId: observabilityExporter.sinkId,
  observabilityExporterStatus: observabilityExporter.status,
  providerAdapterDriverBlockerCount: providerAdapter.driverBlockerCount,
  providerAdapterDriverDiagnosticCodes: providerAdapter.driverDiagnosticCodes,
  providerAdapterDriverId: providerAdapter.driverId,
  providerAdapterDriverLiveQueuePublishingEnabled: false,
  providerAdapterDriverLiveWorkerExecutionEnabled: false,
  providerAdapterDriverMode: providerAdapter.driverMode,
  providerAdapterDriverOperationCount: providerAdapter.driverOperationCount,
  providerAdapterDriverProductionReady: false,
  providerAdapterDriverProviderId: providerAdapter.driverProviderId,
  providerAdapterDriverPublishAttemptPolicy: providerAdapter.driverPublishAttemptPolicy,
  providerAdapterDriverPublishDiagnosticCodes: [...providerAdapter.driverPublishDiagnosticCodes],
  providerAdapterDriverPublishRequestEvaluated: providerAdapter.driverPublishRequestEvaluated,
  providerAdapterDriverPublishResultStatus: providerAdapter.driverPublishResultStatus,
  providerAdapterDriverPublishingActivationStatus: providerAdapter.driverPublishingActivationStatus,
  providerAdapterDriverPublishingBlockerCount: providerAdapter.driverPublishingBlockerCount,
  providerAdapterDriverPublishingLivePublishAttempted: providerAdapter.driverPublishingLivePublishAttempted,
  providerAdapterDriverPublishingLiveQueuePublishingEnabled: providerAdapter.driverPublishingLiveQueuePublishingEnabled,
  providerAdapterDriverPublishingNoLiveSideEffects: { ...providerAdapter.driverPublishingNoLiveSideEffects },
  providerAdapterDriverPublishingPublisherId: providerAdapter.driverPublishingPublisherId,
  providerAdapterDriverPublishingPublisherProvided: providerAdapter.driverPublishingPublisherProvided,
  providerAdapterDriverPublishingRequiredConfigKeys: [...providerAdapter.driverPublishingRequiredConfigKeys],
  providerAdapterDriverPublishingStatus: providerAdapter.driverPublishingStatus,
  providerAdapterDriverRequiredConfigKeys: providerAdapter.driverRequiredConfigKeys,
  providerAdapterDriverStatus: providerAdapter.driverStatus,
  providerAdapterDriverValid: providerAdapter.driverValid,
  providerAdapterDriverSdkBindingActivationGateSatisfied: providerAdapter.driverSdkBinding.activationGateSatisfied,
  providerAdapterDriverSdkBindingBlockerCount: providerAdapter.driverSdkBinding.blockerCount,
  providerAdapterDriverSdkBindingDiagnosticCodes: providerAdapter.driverSdkBinding.diagnosticCodes,
  providerAdapterDriverSdkBindingDisabledLiveOperationCount: providerAdapter.driverSdkBinding.disabledLiveOperationCount,
  providerAdapterDriverSdkBindingId: providerAdapter.driverSdkBinding.bindingId,
  providerAdapterDriverSdkBindingLiveProviderCallAttempted: false,
  providerAdapterDriverSdkBindingLiveQueuePublishingEnabled: false,
  providerAdapterDriverSdkBindingLiveWorkerExecutionEnabled: false,
  providerAdapterDriverSdkBindingMode: providerAdapter.driverSdkBinding.mode,
  providerAdapterDriverSdkBindingOperationCount: providerAdapter.driverSdkBinding.operationCount,
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionBlockerCount: providerAdapter.driverSdkBinding.packageBinding.brokerConnectionBlockerCount,
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: providerAdapter.driverSdkBinding.packageBinding.brokerConnectionDiagnosticCodes,
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: providerAdapter.driverSdkBinding.packageBinding.brokerConnectionHealthCheckMode,
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionId: providerAdapter.driverSdkBinding.packageBinding.brokerConnectionId,
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: providerAdapter.driverSdkBinding.packageBinding.brokerConnectionRequiredConfigKeys,
  providerAdapterDriverSdkBindingPackageBindingBrokerConnectionStatus: providerAdapter.driverSdkBinding.packageBinding.brokerConnectionStatus,
  providerAdapterDriverSdkBindingPackageBindingBlockerCount: providerAdapter.driverSdkBinding.packageBinding.blockerCount,
  providerAdapterDriverSdkBindingPackageBindingBrowserBundleAllowed: false,
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionAttempted: providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionAttempted,
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionBlockerCount: providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionBlockerCount,
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionDiagnosticCodes,
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionFactoryInvoked,
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionId: providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionId,
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionProductionReady: false,
  providerAdapterDriverSdkBindingPackageBindingBullmqConstructionStatus: providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionStatus,
  providerAdapterDriverSdkBindingPackageBindingDiagnosticCodes: providerAdapter.driverSdkBinding.packageBinding.diagnosticCodes,
  providerAdapterDriverSdkBindingPackageBindingFamily: providerAdapter.driverSdkBinding.packageBinding.family,
  providerAdapterDriverSdkBindingPackageBindingId: providerAdapter.driverSdkBinding.packageBinding.bindingId,
  providerAdapterDriverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
  providerAdapterDriverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false,
  providerAdapterDriverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
  providerAdapterDriverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
  providerAdapterDriverSdkBindingPackageBindingPackageName: providerAdapter.driverSdkBinding.packageBinding.packageName,
  providerAdapterDriverSdkBindingPackageBindingPackageRef: providerAdapter.driverSdkBinding.packageBinding.packageRef,
  providerAdapterDriverSdkBindingPackageBindingQueueClientConstructed: providerAdapter.driverSdkBinding.packageBinding.queueClientConstructed,
  providerAdapterDriverSdkBindingPackageBindingQueueEventsConstructed: providerAdapter.driverSdkBinding.packageBinding.queueEventsConstructed,
  providerAdapterDriverSdkBindingPackageBindingSdkClientConstructed: false,
  providerAdapterDriverSdkBindingPackageBindingStatus: providerAdapter.driverSdkBinding.packageBinding.status,
  providerAdapterDriverSdkBindingPackageBindingWorkerConstructed: providerAdapter.driverSdkBinding.packageBinding.workerConstructed,
  providerAdapterDriverSdkBindingProductionReady: false,
  providerAdapterDriverSdkBindingProviderKind: providerAdapter.driverSdkBinding.providerKind,
  providerAdapterDriverSdkBindingQueueRouteCount: providerAdapter.driverSdkBinding.queueRouteCount,
  providerAdapterDriverSdkBindingRequiredConfigKeys: providerAdapter.driverSdkBinding.requiredConfigKeys,
  providerAdapterDriverSdkBindingSdkClientConstructed: false,
  providerAdapterDriverSdkBindingSdkPackageRef: providerAdapter.driverSdkBinding.sdkPackageRef,
  providerAdapterDriverSdkBindingStatus: providerAdapter.driverSdkBinding.status,
  providerAdapterDriverSdkBindingValid: providerAdapter.driverSdkBinding.valid,
  providerAdapterBlockerCount: providerAdapter.blockerCount,
  providerAdapterDiagnosticCodes: providerAdapter.diagnosticCodes,
  providerAdapterId: providerAdapter.adapterId,
  providerAdapterMode: providerAdapter.mode,
  providerAdapterStatus: providerAdapter.status,
  providerId: providerAdapter.providerId,
  providerRequiredConfigKeys: providerAdapter.requiredConfigKeys,
  productionReady: false,
  queueCategoryCount: new Set(queueRuntimePlans.map((item) => item.queueCategory)).size,
  queueIds: [...new Set(queueRuntimePlans.map((item) => item.queueId))],
  queuePlanCount: queueRuntimePlans.length,
});

const createIdempotencyStoreSummary = (
  idempotencyStore: ReturnType<typeof createWorkerIdempotencyStoreFoundation>,
): QueueRuntimeIdempotencyStoreSummary => ({
  adapterId: idempotencyStore.adapterId,
  blockerCount: idempotencyStore.blockerCount,
  diagnosticCodes: idempotencyStore.diagnosticCodes,
  disabledLiveOperationCount: idempotencyStore.readiness.disabledLiveOperationCount,
  keySchemaVersion: idempotencyStore.keySchemaVersion,
  liveIdempotencyExecutionEnabled: false,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode: idempotencyStore.mode,
  namespace: idempotencyStore.namespace,
  operationCapabilities: idempotencyStore.operationCapabilities.map((item) => ({ ...item })),
  operationCount: idempotencyStore.readiness.operationCount,
  productionReady: false,
  requiredConfigKeys: idempotencyStore.readiness.requiredConfigKeys,
  status: idempotencyStore.status,
  storeId: idempotencyStore.storeId,
  valid: idempotencyStore.valid,
});

const createLeaseStoreSummary = (
  leaseStore: ReturnType<typeof createWorkerLeaseStoreFoundation>,
): QueueRuntimeLeaseStoreSummary => ({
  adapterId: leaseStore.adapterId,
  blockerCount: leaseStore.blockerCount,
  diagnosticCodes: leaseStore.diagnosticCodes,
  disabledLiveOperationCount: leaseStore.readiness.disabledLiveOperationCount,
  heartbeatIntervalSeconds: leaseStore.readiness.heartbeatIntervalSeconds,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode: leaseStore.mode,
  operationCapabilities: leaseStore.operationCapabilities.map((item) => ({ ...item })),
  operationCount: leaseStore.readiness.operationCount,
  productionReady: false,
  requiredConfigKeys: leaseStore.readiness.requiredConfigKeys,
  status: leaseStore.status,
  storeId: leaseStore.storeId,
  ttlSeconds: leaseStore.readiness.ttlSeconds,
  valid: leaseStore.valid,
});

const createProviderAdapterSummary = (
  providerAdapter: ReturnType<typeof createQueueProviderAdapterFoundation>,
): QueueRuntimeProviderAdapterSummary => ({
  adapterId: providerAdapter.adapterId,
  blockerCount: providerAdapter.blockerCount,
  diagnosticCodes: providerAdapter.diagnosticCodes,
  disabledLiveOperationCount: providerAdapter.readiness.disabledLiveOperationCount,
  driverActivationGateSatisfied: providerAdapter.driver.activationGateSatisfied,
  driverBlockerCount: providerAdapter.driver.blockerCount,
  driverDiagnosticCodes: providerAdapter.driver.diagnosticCodes,
  driverId: providerAdapter.driver.driverId,
  driverLiveQueuePublishingEnabled: false,
  driverLiveWorkerExecutionEnabled: false,
  driverMode: providerAdapter.driver.mode,
  driverOperationCapabilities: providerAdapter.driver.operationCapabilities.map((item) => ({ ...item })),
  driverOperationCount: providerAdapter.driver.operationCount,
  driverProductionReady: false,
  driverProviderId: providerAdapter.driver.providerId,
  driverPublishAttemptPolicy: providerAdapter.driver.publishPosture.attemptPolicy,
  driverPublishDiagnosticCodes: [...providerAdapter.driver.publishPosture.diagnosticCodes],
  driverPublishRequestEvaluated: providerAdapter.driver.publishPosture.publishRequestEvaluated,
  driverPublishResultStatus: providerAdapter.driver.publishPosture.resultStatus,
  driverPublishingActivationStatus: providerAdapter.driver.publishingReadiness.activationStatus,
  driverPublishingBlockerCount: providerAdapter.driver.publishingReadiness.blockerCount,
  driverPublishingLivePublishAttempted: providerAdapter.driver.publishPosture.livePublishAttempted,
  driverPublishingLiveQueuePublishingEnabled: providerAdapter.driver.publishingReadiness.liveQueuePublishingEnabled,
  driverPublishingNoLiveSideEffects: { ...providerAdapter.driver.publishingReadiness.noLiveSideEffects },
  driverPublishingPublisherId: providerAdapter.driver.publishingReadiness.publisherId,
  driverPublishingPublisherProvided: providerAdapter.driver.publishingReadiness.publisherProvided,
  driverPublishingRequiredConfigKeys: [...providerAdapter.driver.publishingReadiness.requiredConfigKeys],
  driverPublishingStatus: providerAdapter.driver.publishingReadiness.status,
  driverRequiredConfigKeys: providerAdapter.driver.requiredConfigKeys,
  driverSdkBinding: {
    ...providerAdapter.driver.sdkBinding,
    diagnosticCodes: [...providerAdapter.driver.sdkBinding.diagnosticCodes],
    operationCapabilities: providerAdapter.driver.sdkBinding.operationCapabilities.map((item) => ({ ...item })),
    packageBinding: {
      ...providerAdapter.driver.sdkBinding.packageBinding,
      brokerConnection: {
        ...providerAdapter.driver.sdkBinding.packageBinding.brokerConnection,
        diagnosticCodes: [...providerAdapter.driver.sdkBinding.packageBinding.brokerConnection.diagnosticCodes],
        requiredConfigKeys: [...providerAdapter.driver.sdkBinding.packageBinding.brokerConnection.requiredConfigKeys],
      },
      brokerConnectionDiagnosticCodes: [...providerAdapter.driver.sdkBinding.packageBinding.brokerConnectionDiagnosticCodes],
      brokerConnectionRequiredConfigKeys: [...providerAdapter.driver.sdkBinding.packageBinding.brokerConnectionRequiredConfigKeys],
      diagnosticCodes: [...providerAdapter.driver.sdkBinding.packageBinding.diagnosticCodes],
      requiredConfigKeys: [...providerAdapter.driver.sdkBinding.packageBinding.requiredConfigKeys],
    },
    requiredConfigKeys: [...providerAdapter.driver.sdkBinding.requiredConfigKeys],
  },
  driverStatus: providerAdapter.driver.status,
  driverValid: providerAdapter.driver.valid,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode: providerAdapter.mode,
  operationCapabilities: providerAdapter.operationCapabilities.map((item) => ({ ...item })),
  operationCount: providerAdapter.readiness.operationCount,
  productionReady: false,
  providerId: providerAdapter.providerId,
  requiredConfigKeys: providerAdapter.readiness.requiredConfigKeys,
  status: providerAdapter.status,
  valid: providerAdapter.valid,
});

const createObservabilityExporterSummary = (
  observabilityExporter: ReturnType<typeof createObservabilityExporterFoundation>,
): QueueRuntimeObservabilityExporterSummary => ({
  adapterId: observabilityExporter.adapterId,
  blockerCount: observabilityExporter.blockerCount,
  diagnosticCodes: observabilityExporter.diagnosticCodes,
  disabledLiveOperationCount: observabilityExporter.readiness.disabledLiveOperationCount,
  exporterId: observabilityExporter.exporterId,
  liveAlertRoutingEnabled: false,
  liveLogExportEnabled: false,
  liveMetricsExportEnabled: false,
  liveTelemetryExportEnabled: false,
  liveTraceExportEnabled: false,
  metricNamespace: observabilityExporter.metricNamespace,
  mode: observabilityExporter.mode,
  operationCapabilities: observabilityExporter.operationCapabilities.map((item) => ({ ...item })),
  operationCount: observabilityExporter.readiness.operationCount,
  productionReady: false,
  requiredConfigKeys: observabilityExporter.readiness.requiredConfigKeys,
  sinkId: observabilityExporter.sinkId,
  status: observabilityExporter.status,
  valid: observabilityExporter.valid,
});

const resolveStatus = (
  profileId: QueueRuntimeProfileId,
  blockerCount: number,
): QueueRuntimeFoundationStatus => {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "local-review" ? "local_ready" : "scaffolded";
};

const sanitizeQueueRuntimeString = (value: string): string => {
  const redacted = redactQueueRuntimeValue(value);

  return typeof redacted === "string" ? redacted : REDACTED_VALUE;
};

const isSafeSerializableQueueKey = (key: string): boolean =>
  /^(attempt|idempotencyKey|jobId|payloadReference|queueId|requestedAt|traceId)$/i.test(key);

const isSensitiveQueueRuntimeKey = (key: string): boolean =>
  /bearer|credential|job[-_]?payload|lease[-_]?token|object[-_]?key|provider[-_]?payload|queue[-_]?url|secret|signed[-_]?url|token|webhook[-_]?secret|wallet[-_]?address/i.test(
    key,
  );

const isUnsafeQueueRuntimeString = (value: string): boolean =>
  isCredentialedUrl(value)
  || isLikelyObjectKey(value)
  || isSensitiveQueueRuntimeString(value)
  || isWalletAddressString(value);

const isSensitiveQueueRuntimeString = (value: string): boolean =>
  /(bearer\s+|hook-secret|lease-token|object-key|queue-secret|secret|token=|worker-token|x-amz-signature=|signed-url)/i.test(
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

const isRawJobPayload = (value: string): boolean => {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  return /address|job|payload|provider|task|wallet/i.test(trimmed);
};
