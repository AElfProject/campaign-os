import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createWorkerLeaseStoreFoundation,
  type WorkerLeaseDiagnosticCode,
  type WorkerLeaseOperationCapability,
  type WorkerLeaseStoreFoundationStatus,
  type WorkerLeaseStoreMode,
  type WorkerLeaseStoreNoLiveFlags,
} from "./workerLeaseStore";

export type WorkerSchedulerProfileId = BackendRuntimeProfileId;
export type WorkerSchedulerFoundationStatus = "local_ready" | "scaffolded" | "blocked";
export type WorkerJobFamily =
  | "task_verification"
  | "campaign_lifecycle"
  | "eligibility_refresh"
  | "export_preparation"
  | "analytics_ingestion_handoff"
  | "ai_ops_report"
  | "stale_review_cleanup"
  | "contract_sync_handoff"
  | "reward_distribution_handoff";
export type WorkerTriggerSource =
  | "manual"
  | "api_request"
  | "campaign_time"
  | "recurring"
  | "retry"
  | "operator_triggered";
export type WorkerLocalReviewBehavior =
  | "disabled_dry_run"
  | "manual_review_only"
  | "metadata_projection";
export type WorkerSchedulerDiagnosticSeverity = "error" | "warning" | "info";
export type WorkerSchedulerDiagnosticCode =
  | "UNKNOWN_WORKER_SCHEDULER_PROFILE"
  | "WORKER_QUEUE_MISSING"
  | "SCHEDULER_ENDPOINT_MISSING"
  | "RETRY_BACKOFF_POLICY_MISSING"
  | "IDEMPOTENCY_STORE_MISSING"
  | "WORKER_LEASE_MISSING"
  | "OBSERVABILITY_MISSING"
  | "PROVIDER_HANDOFF_MISSING"
  | "UNKNOWN_WORKER_JOB"
  | "UNKNOWN_RETRY_POLICY"
  | "UNKNOWN_IDEMPOTENCY_POLICY";
export type RetryBackoffStrategy = "exponential" | "fixed" | "none";
export type DuplicateSideEffectRisk =
  | "duplicate_analytics_ingestion"
  | "duplicate_contract_sync"
  | "duplicate_exports"
  | "duplicate_points"
  | "duplicate_reward_handoff";
export type IdempotencyDuplicateOutcome =
  | "blocked"
  | "drop_duplicate"
  | "manual_review"
  | "return_existing";
export type WorkerRuntimePreconditionArea =
  | "idempotency"
  | "lease"
  | "observability"
  | "provider"
  | "scheduler"
  | "worker";

export interface WorkerSchedulerNoLiveFlags {
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

export interface WorkerJobDefinition {
  family: WorkerJobFamily;
  id: string;
  label: string;
  localReviewBehavior: WorkerLocalReviewBehavior;
  ownerServiceId: string;
  productionDependencyIds: string[];
  requiredConfigKeys: string[];
  requiredProviderGroupIds: string[];
  sideEffectBoundary: string;
  triggerSources: WorkerTriggerSource[];
}

export interface SchedulerPolicy {
  cadence: string;
  concurrencyLimit: number;
  deadlineSeconds: number;
  id: string;
  idempotencyPolicyId: string;
  jobId: string;
  liveExecutionEnabled: false;
  localExecutionEnabled: false;
  manualOverrideAllowed: boolean;
  retryPolicyId: string;
  triggerSource: WorkerTriggerSource;
}

export interface RetryBackoffPolicy {
  duplicateSideEffectRisk: DuplicateSideEffectRisk[];
  id: string;
  initialDelaySeconds: number;
  maxAttempts: number;
  maxDelaySeconds: number;
  strategy: RetryBackoffStrategy;
}

export interface IdempotencyPolicy {
  duplicateOutcome: IdempotencyDuplicateOutcome;
  id: string;
  keyParts: string[];
  requiresStore: true;
  sideEffectBoundary: string;
  storeDependencyId: string;
}

export interface WorkerRuntimePrecondition {
  area: WorkerRuntimePreconditionArea;
  diagnosticCode: WorkerSchedulerDiagnosticCode;
  id: string;
  requiredBeforeProduction: true;
  requiredConfigKeys: string[];
  status: "blocked" | "deferred";
}

export interface WorkerSchedulerDiagnostic {
  code: WorkerSchedulerDiagnosticCode;
  field: string;
  message: string;
  severity: WorkerSchedulerDiagnosticSeverity;
}

export interface WorkerSchedulerLeaseStoreSummary {
  adapterId: string;
  blockerCount: number;
  diagnosticCodes: WorkerLeaseDiagnosticCode[];
  disabledLiveOperationCount: number;
  heartbeatIntervalSeconds: number;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: WorkerLeaseStoreMode;
  noLiveFlags: WorkerLeaseStoreNoLiveFlags;
  operationCapabilities: WorkerLeaseOperationCapability[];
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status: WorkerLeaseStoreFoundationStatus;
  storeId: string;
  ttlSeconds: number;
  valid: boolean;
}

export interface WorkerSchedulerReadinessProjection {
  blockerCount: number;
  diagnosticCodes: WorkerSchedulerDiagnosticCode[];
  jobCatalogCount: number;
  jobFamilyCount: number;
  leaseStoreBlockerCount: number;
  leaseStoreDiagnosticCodes: WorkerLeaseDiagnosticCode[];
  leaseStoreId: string;
  leaseStoreLiveQueuePublishingEnabled: false;
  leaseStoreLiveWorkerExecutionEnabled: false;
  leaseStoreMode: WorkerLeaseStoreMode;
  leaseStoreRequiredConfigKeys: string[];
  leaseStoreStatus: WorkerLeaseStoreFoundationStatus;
  liveSchedulerExecutionEnabled: false;
  liveWorkerExecutionEnabled: false;
  localReviewReady: boolean;
  productionReady: false;
  schedulePolicyCount: number;
  triggerSourceCount: number;
}

export interface WorkerSchedulerFoundationSummary {
  blockerCount: number;
  diagnosticCodes: WorkerSchedulerDiagnosticCode[];
  diagnostics: WorkerSchedulerDiagnostic[];
  id: "campaign-os-worker-scheduler-foundation";
  idempotencyPolicies: IdempotencyPolicy[];
  jobCatalog: WorkerJobDefinition[];
  leaseStore: WorkerSchedulerLeaseStoreSummary;
  noLiveFlags: WorkerSchedulerNoLiveFlags;
  preconditions: WorkerRuntimePrecondition[];
  productionReady: false;
  profileId: WorkerSchedulerProfileId;
  readiness: WorkerSchedulerReadinessProjection;
  retryBackoffPolicies: RetryBackoffPolicy[];
  schedulerPolicies: SchedulerPolicy[];
  status: WorkerSchedulerFoundationStatus;
  valid: boolean;
}

export interface CreateWorkerSchedulerFoundationOptions {
  env?: Record<string, unknown>;
  profileId?: string;
}

type WorkerSchedulerProductionPrecondition = WorkerRuntimePrecondition & {
  field: string;
  message: string;
};

const REDACTED_VALUE = "[redacted]";
const RAW_JOB_PAYLOAD_VALUE = "[redacted-job-payload]";

export const SUPPORTED_WORKER_SCHEDULER_PROFILES: WorkerSchedulerProfileId[] = [
  "local-review",
  "staging-scaffold",
  "production-required",
];

export const workerSchedulerTriggerSources: WorkerTriggerSource[] = [
  "manual",
  "api_request",
  "campaign_time",
  "recurring",
  "retry",
  "operator_triggered",
];

export const workerSchedulerNoLiveFlags: WorkerSchedulerNoLiveFlags = {
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

const job = (definition: WorkerJobDefinition): WorkerJobDefinition => definition;

export const workerJobCatalog: WorkerJobDefinition[] = [
  job({
    family: "task_verification",
    id: "task-verification-worker",
    label: "Task verification worker handoff",
    localReviewBehavior: "metadata_projection",
    ownerServiceId: "verification-service",
    productionDependencyIds: [
      "worker-queue",
      "scheduler-endpoint",
      "idempotency-store",
      "provider-handoff",
    ],
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_QUEUE_URL"],
    requiredProviderGroupIds: [
      "aefinder-aelfscan-indexers",
      "dapp-api-adapters",
      "social-api-adapters",
      "manual-review",
    ],
    sideEffectBoundary: "no-live-verification-handoff",
    triggerSources: ["api_request", "retry", "operator_triggered"],
  }),
  job({
    family: "campaign_lifecycle",
    id: "campaign-lifecycle-worker",
    label: "Campaign lifecycle transition scheduler",
    localReviewBehavior: "disabled_dry_run",
    ownerServiceId: "campaign-service",
    productionDependencyIds: ["scheduler-endpoint", "worker-queue", "worker-lease"],
    requiredConfigKeys: ["CAMPAIGN_OS_SCHEDULER_ENDPOINT"],
    requiredProviderGroupIds: [],
    sideEffectBoundary: "no-live-campaign-status-transition",
    triggerSources: ["campaign_time", "manual", "operator_triggered"],
  }),
  job({
    family: "eligibility_refresh",
    id: "eligibility-refresh-worker",
    label: "Eligibility refresh handoff",
    localReviewBehavior: "metadata_projection",
    ownerServiceId: "eligibility-service",
    productionDependencyIds: ["worker-queue", "idempotency-store", "provider-handoff"],
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_QUEUE_URL"],
    requiredProviderGroupIds: ["aefinder-aelfscan-indexers", "dapp-api-adapters"],
    sideEffectBoundary: "no-live-eligibility-recompute",
    triggerSources: ["recurring", "retry", "operator_triggered"],
  }),
  job({
    family: "export_preparation",
    id: "export-preparation-worker",
    label: "Winner export preparation handoff",
    localReviewBehavior: "manual_review_only",
    ownerServiceId: "export-service",
    productionDependencyIds: ["worker-queue", "idempotency-store", "observability"],
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_QUEUE_URL"],
    requiredProviderGroupIds: [],
    sideEffectBoundary: "no-live-export-artifact-write",
    triggerSources: ["operator_triggered", "retry"],
  }),
  job({
    family: "analytics_ingestion_handoff",
    id: "analytics-ingestion-handoff-worker",
    label: "Analytics ingestion handoff",
    localReviewBehavior: "metadata_projection",
    ownerServiceId: "runtime-observability",
    productionDependencyIds: ["worker-queue", "idempotency-store", "observability"],
    requiredConfigKeys: ["CAMPAIGN_OS_ANALYTICS_WAREHOUSE_URL"],
    requiredProviderGroupIds: ["analytics-warehouse-adapter"],
    sideEffectBoundary: "no-live-analytics-ingestion",
    triggerSources: ["recurring", "retry"],
  }),
  job({
    family: "ai_ops_report",
    id: "ai-ops-report-worker",
    label: "AI Ops report generation handoff",
    localReviewBehavior: "metadata_projection",
    ownerServiceId: "ai-ops-service",
    productionDependencyIds: ["worker-queue", "observability", "provider-handoff"],
    requiredConfigKeys: ["CAMPAIGN_OS_AI_PROVIDER_ENDPOINT"],
    requiredProviderGroupIds: ["ai-provider-adapters"],
    sideEffectBoundary: "no-live-ai-provider-call",
    triggerSources: ["recurring", "operator_triggered"],
  }),
  job({
    family: "stale_review_cleanup",
    id: "stale-review-cleanup-worker",
    label: "Stale review cleanup handoff",
    localReviewBehavior: "manual_review_only",
    ownerServiceId: "risk-scoring-service",
    productionDependencyIds: ["scheduler-endpoint", "worker-queue", "worker-lease"],
    requiredConfigKeys: ["CAMPAIGN_OS_SCHEDULER_ENDPOINT"],
    requiredProviderGroupIds: ["manual-review"],
    sideEffectBoundary: "no-live-review-state-mutation",
    triggerSources: ["recurring", "operator_triggered"],
  }),
  job({
    family: "contract_sync_handoff",
    id: "contract-sync-handoff-worker",
    label: "Contract sync handoff",
    localReviewBehavior: "disabled_dry_run",
    ownerServiceId: "runtime-observability",
    productionDependencyIds: ["worker-queue", "idempotency-store", "observability"],
    requiredConfigKeys: ["CAMPAIGN_OS_CONTRACT_WRITER_ENDPOINT"],
    requiredProviderGroupIds: ["contract-reader-adapter", "contract-writer-adapter"],
    sideEffectBoundary: "no-live-contract-read-or-write",
    triggerSources: ["operator_triggered", "retry"],
  }),
  job({
    family: "reward_distribution_handoff",
    id: "reward-distribution-handoff-worker",
    label: "Reward distribution handoff",
    localReviewBehavior: "manual_review_only",
    ownerServiceId: "points-ranking-service",
    productionDependencyIds: ["worker-queue", "idempotency-store", "observability"],
    requiredConfigKeys: [
      "CAMPAIGN_OS_REWARD_CUSTODY_ACCOUNT",
      "CAMPAIGN_OS_REWARD_DISTRIBUTION_QUEUE",
    ],
    requiredProviderGroupIds: ["contract-writer-adapter"],
    sideEffectBoundary: "no-live-reward-custody-or-distribution",
    triggerSources: ["operator_triggered", "retry"],
  }),
];

const retryPolicy = (policy: RetryBackoffPolicy): RetryBackoffPolicy => policy;

export const workerRetryBackoffPolicies: RetryBackoffPolicy[] = [
  retryPolicy({
    duplicateSideEffectRisk: ["duplicate_points"],
    id: "verification-exponential-review",
    initialDelaySeconds: 60,
    maxAttempts: 3,
    maxDelaySeconds: 900,
    strategy: "exponential",
  }),
  retryPolicy({
    duplicateSideEffectRisk: [],
    id: "lifecycle-fixed-window",
    initialDelaySeconds: 30,
    maxAttempts: 2,
    maxDelaySeconds: 300,
    strategy: "fixed",
  }),
  retryPolicy({
    duplicateSideEffectRisk: ["duplicate_exports"],
    id: "export-manual-review",
    initialDelaySeconds: 0,
    maxAttempts: 1,
    maxDelaySeconds: 0,
    strategy: "none",
  }),
  retryPolicy({
    duplicateSideEffectRisk: ["duplicate_analytics_ingestion"],
    id: "analytics-bounded-retry",
    initialDelaySeconds: 120,
    maxAttempts: 3,
    maxDelaySeconds: 1800,
    strategy: "exponential",
  }),
  retryPolicy({
    duplicateSideEffectRisk: [],
    id: "ai-ops-report-retry",
    initialDelaySeconds: 300,
    maxAttempts: 2,
    maxDelaySeconds: 3600,
    strategy: "fixed",
  }),
  retryPolicy({
    duplicateSideEffectRisk: [],
    id: "review-cleanup-fixed",
    initialDelaySeconds: 300,
    maxAttempts: 2,
    maxDelaySeconds: 1800,
    strategy: "fixed",
  }),
  retryPolicy({
    duplicateSideEffectRisk: ["duplicate_contract_sync"],
    id: "contract-sync-manual",
    initialDelaySeconds: 0,
    maxAttempts: 1,
    maxDelaySeconds: 0,
    strategy: "none",
  }),
  retryPolicy({
    duplicateSideEffectRisk: ["duplicate_reward_handoff"],
    id: "reward-handoff-manual",
    initialDelaySeconds: 0,
    maxAttempts: 1,
    maxDelaySeconds: 0,
    strategy: "none",
  }),
];

const idempotencyPolicy = (policy: IdempotencyPolicy): IdempotencyPolicy => policy;

export const workerIdempotencyPolicies: IdempotencyPolicy[] = [
  idempotencyPolicy({
    duplicateOutcome: "return_existing",
    id: "task-verification-idempotency",
    keyParts: ["campaignId", "taskId", "walletAddress", "verificationType"],
    requiresStore: true,
    sideEffectBoundary: "points-ledger-and-task-completion",
    storeDependencyId: "idempotency-store",
  }),
  idempotencyPolicy({
    duplicateOutcome: "drop_duplicate",
    id: "campaign-lifecycle-idempotency",
    keyParts: ["campaignId", "targetStatus", "scheduledAt"],
    requiresStore: true,
    sideEffectBoundary: "campaign-status-transition",
    storeDependencyId: "idempotency-store",
  }),
  idempotencyPolicy({
    duplicateOutcome: "return_existing",
    id: "eligibility-refresh-idempotency",
    keyParts: ["campaignId", "walletAddress", "refreshWindow"],
    requiresStore: true,
    sideEffectBoundary: "eligibility-projection",
    storeDependencyId: "idempotency-store",
  }),
  idempotencyPolicy({
    duplicateOutcome: "manual_review",
    id: "export-preparation-idempotency",
    keyParts: ["campaignId", "exportBatchId", "format"],
    requiresStore: true,
    sideEffectBoundary: "export-artifact",
    storeDependencyId: "idempotency-store",
  }),
  idempotencyPolicy({
    duplicateOutcome: "drop_duplicate",
    id: "analytics-ingestion-idempotency",
    keyParts: ["campaignId", "eventWindow", "metricGroup"],
    requiresStore: true,
    sideEffectBoundary: "analytics-event-batch",
    storeDependencyId: "idempotency-store",
  }),
  idempotencyPolicy({
    duplicateOutcome: "return_existing",
    id: "ai-ops-report-idempotency",
    keyParts: ["campaignId", "reportDate", "reportType"],
    requiresStore: true,
    sideEffectBoundary: "ai-report-draft",
    storeDependencyId: "idempotency-store",
  }),
  idempotencyPolicy({
    duplicateOutcome: "drop_duplicate",
    id: "stale-review-cleanup-idempotency",
    keyParts: ["campaignId", "reviewQueueId", "cleanupWindow"],
    requiresStore: true,
    sideEffectBoundary: "manual-review-queue",
    storeDependencyId: "idempotency-store",
  }),
  idempotencyPolicy({
    duplicateOutcome: "blocked",
    id: "contract-sync-idempotency",
    keyParts: ["campaignId", "contractMode", "rootHash"],
    requiresStore: true,
    sideEffectBoundary: "contract-sync",
    storeDependencyId: "idempotency-store",
  }),
  idempotencyPolicy({
    duplicateOutcome: "blocked",
    id: "reward-distribution-idempotency",
    keyParts: ["campaignId", "rewardBatchId", "distributionMode"],
    requiresStore: true,
    sideEffectBoundary: "reward-distribution",
    storeDependencyId: "idempotency-store",
  }),
];

const schedulerPolicy = (policy: SchedulerPolicy): SchedulerPolicy => policy;

export const workerSchedulerPolicies: SchedulerPolicy[] = [
  schedulerPolicy({
    cadence: "on_verify_request",
    concurrencyLimit: 10,
    deadlineSeconds: 120,
    id: "task-verification-on-request",
    idempotencyPolicyId: "task-verification-idempotency",
    jobId: "task-verification-worker",
    liveExecutionEnabled: false,
    localExecutionEnabled: false,
    manualOverrideAllowed: true,
    retryPolicyId: "verification-exponential-review",
    triggerSource: "api_request",
  }),
  schedulerPolicy({
    cadence: "campaign_start_end_time",
    concurrencyLimit: 1,
    deadlineSeconds: 300,
    id: "campaign-lifecycle-time-boundary",
    idempotencyPolicyId: "campaign-lifecycle-idempotency",
    jobId: "campaign-lifecycle-worker",
    liveExecutionEnabled: false,
    localExecutionEnabled: false,
    manualOverrideAllowed: true,
    retryPolicyId: "lifecycle-fixed-window",
    triggerSource: "campaign_time",
  }),
  schedulerPolicy({
    cadence: "hourly_eligibility_projection",
    concurrencyLimit: 5,
    deadlineSeconds: 600,
    id: "eligibility-refresh-recurring",
    idempotencyPolicyId: "eligibility-refresh-idempotency",
    jobId: "eligibility-refresh-worker",
    liveExecutionEnabled: false,
    localExecutionEnabled: false,
    manualOverrideAllowed: true,
    retryPolicyId: "verification-exponential-review",
    triggerSource: "recurring",
  }),
  schedulerPolicy({
    cadence: "operator_export_request",
    concurrencyLimit: 1,
    deadlineSeconds: 900,
    id: "export-preparation-operator",
    idempotencyPolicyId: "export-preparation-idempotency",
    jobId: "export-preparation-worker",
    liveExecutionEnabled: false,
    localExecutionEnabled: false,
    manualOverrideAllowed: true,
    retryPolicyId: "export-manual-review",
    triggerSource: "operator_triggered",
  }),
  schedulerPolicy({
    cadence: "daily_analytics_handoff",
    concurrencyLimit: 3,
    deadlineSeconds: 900,
    id: "analytics-ingestion-recurring",
    idempotencyPolicyId: "analytics-ingestion-idempotency",
    jobId: "analytics-ingestion-handoff-worker",
    liveExecutionEnabled: false,
    localExecutionEnabled: false,
    manualOverrideAllowed: true,
    retryPolicyId: "analytics-bounded-retry",
    triggerSource: "recurring",
  }),
  schedulerPolicy({
    cadence: "daily_ai_ops_report",
    concurrencyLimit: 2,
    deadlineSeconds: 1200,
    id: "ai-ops-report-recurring",
    idempotencyPolicyId: "ai-ops-report-idempotency",
    jobId: "ai-ops-report-worker",
    liveExecutionEnabled: false,
    localExecutionEnabled: false,
    manualOverrideAllowed: true,
    retryPolicyId: "ai-ops-report-retry",
    triggerSource: "recurring",
  }),
  schedulerPolicy({
    cadence: "operator_stale_review_cleanup",
    concurrencyLimit: 2,
    deadlineSeconds: 600,
    id: "stale-review-cleanup-operator",
    idempotencyPolicyId: "stale-review-cleanup-idempotency",
    jobId: "stale-review-cleanup-worker",
    liveExecutionEnabled: false,
    localExecutionEnabled: false,
    manualOverrideAllowed: true,
    retryPolicyId: "review-cleanup-fixed",
    triggerSource: "operator_triggered",
  }),
  schedulerPolicy({
    cadence: "operator_contract_sync_review",
    concurrencyLimit: 1,
    deadlineSeconds: 900,
    id: "contract-sync-operator",
    idempotencyPolicyId: "contract-sync-idempotency",
    jobId: "contract-sync-handoff-worker",
    liveExecutionEnabled: false,
    localExecutionEnabled: false,
    manualOverrideAllowed: true,
    retryPolicyId: "contract-sync-manual",
    triggerSource: "operator_triggered",
  }),
  schedulerPolicy({
    cadence: "operator_reward_release_review",
    concurrencyLimit: 1,
    deadlineSeconds: 900,
    id: "reward-distribution-operator",
    idempotencyPolicyId: "reward-distribution-idempotency",
    jobId: "reward-distribution-handoff-worker",
    liveExecutionEnabled: false,
    localExecutionEnabled: false,
    manualOverrideAllowed: true,
    retryPolicyId: "reward-handoff-manual",
    triggerSource: "operator_triggered",
  }),
];

const precondition = (
  item: WorkerSchedulerProductionPrecondition,
): WorkerSchedulerProductionPrecondition => item;

export const workerSchedulerProductionPreconditions: WorkerSchedulerProductionPrecondition[] = [
  precondition({
    area: "worker",
    diagnosticCode: "WORKER_QUEUE_MISSING",
    field: "CAMPAIGN_OS_WORKER_QUEUE_URL",
    id: "worker-queue",
    message: "Worker queue URL is required before live worker queue publishing.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_QUEUE_URL"],
    status: "deferred",
  }),
  precondition({
    area: "scheduler",
    diagnosticCode: "SCHEDULER_ENDPOINT_MISSING",
    field: "CAMPAIGN_OS_SCHEDULER_ENDPOINT",
    id: "scheduler-endpoint",
    message: "Scheduler endpoint is required before live scheduler execution.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_SCHEDULER_ENDPOINT"],
    status: "deferred",
  }),
  precondition({
    area: "scheduler",
    diagnosticCode: "RETRY_BACKOFF_POLICY_MISSING",
    field: "CAMPAIGN_OS_WORKER_RETRY_POLICY",
    id: "retry-backoff-policy",
    message: "Retry/backoff policy must be configured before live worker retries.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_RETRY_POLICY"],
    status: "blocked",
  }),
  precondition({
    area: "idempotency",
    diagnosticCode: "IDEMPOTENCY_STORE_MISSING",
    field: "CAMPAIGN_OS_IDEMPOTENCY_STORE_URL",
    id: "idempotency-store",
    message: "Idempotency store is required before live side-effecting worker execution.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_IDEMPOTENCY_STORE_URL"],
    status: "blocked",
  }),
  precondition({
    area: "lease",
    diagnosticCode: "WORKER_LEASE_MISSING",
    field: "CAMPAIGN_OS_WORKER_LEASE_STORE_URL",
    id: "worker-lease",
    message: "Worker lease store is required before concurrent live worker execution.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_WORKER_LEASE_STORE_URL"],
    status: "blocked",
  }),
  precondition({
    area: "observability",
    diagnosticCode: "OBSERVABILITY_MISSING",
    field: "CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL",
    id: "observability",
    message: "Observability exporter is required before production worker runtime visibility.",
    requiredBeforeProduction: true,
    requiredConfigKeys: ["CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL"],
    status: "deferred",
  }),
  precondition({
    area: "provider",
    diagnosticCode: "PROVIDER_HANDOFF_MISSING",
    field: "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
    id: "provider-handoff",
    message: "Provider handoff must be configured before provider-backed worker jobs execute.",
    requiredBeforeProduction: true,
    requiredConfigKeys: [
      "CAMPAIGN_OS_PROVIDER_REGISTRY_URL",
      "CAMPAIGN_OS_DEGRADATION_POLICY",
    ],
    status: "deferred",
  }),
];

const knownJobIds = new Set(workerJobCatalog.map((item) => item.id));
const knownRetryPolicyIds = new Set(workerRetryBackoffPolicies.map((item) => item.id));
const knownIdempotencyPolicyIds = new Set(workerIdempotencyPolicies.map((item) => item.id));

const isWorkerSchedulerProfileId = (value: string): value is WorkerSchedulerProfileId =>
  SUPPORTED_WORKER_SCHEDULER_PROFILES.includes(value as WorkerSchedulerProfileId);

const diagnostic = (
  code: WorkerSchedulerDiagnosticCode,
  field: string,
  message: string,
  severity: WorkerSchedulerDiagnosticSeverity = "error",
): WorkerSchedulerDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const hasConfiguredValue = (env: Record<string, unknown>, keys: readonly string[]): boolean =>
  keys.some((key) => {
    const value = env[key];
    return typeof value === "string" ? value.trim().length > 0 : value !== undefined && value !== null;
  });

const resolveProfile = (
  requestedProfileId: string | undefined,
): { diagnostics: WorkerSchedulerDiagnostic[]; profileId: WorkerSchedulerProfileId; valid: boolean } => {
  const profileId = requestedProfileId ?? "local-review";

  if (isWorkerSchedulerProfileId(profileId)) {
    return {
      diagnostics: [],
      profileId,
      valid: true,
    };
  }

  return {
    diagnostics: [
      diagnostic(
        "UNKNOWN_WORKER_SCHEDULER_PROFILE",
        "profileId",
        `Unsupported worker/scheduler profile: ${redactWorkerSchedulerValue(profileId)}`,
      ),
    ],
    profileId: "production-required",
    valid: false,
  };
};

const createProductionDiagnostics = (
  env: Record<string, unknown>,
): WorkerSchedulerDiagnostic[] =>
  workerSchedulerProductionPreconditions
    .filter((item) => !hasConfiguredValue(env, item.requiredConfigKeys))
    .map((item) => diagnostic(item.diagnosticCode, item.field, item.message));

const createRegistryDiagnostics = (): WorkerSchedulerDiagnostic[] =>
  workerSchedulerPolicies.flatMap((policy) => {
    const diagnostics: WorkerSchedulerDiagnostic[] = [];

    if (!knownJobIds.has(policy.jobId)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_WORKER_JOB",
          "jobId",
          `Unknown worker job id: ${redactWorkerSchedulerValue(policy.jobId)}`,
        ),
      );
    }

    if (!knownRetryPolicyIds.has(policy.retryPolicyId)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_RETRY_POLICY",
          "retryPolicyId",
          `Unknown retry policy id: ${redactWorkerSchedulerValue(policy.retryPolicyId)}`,
        ),
      );
    }

    if (!knownIdempotencyPolicyIds.has(policy.idempotencyPolicyId)) {
      diagnostics.push(
        diagnostic(
          "UNKNOWN_IDEMPOTENCY_POLICY",
          "idempotencyPolicyId",
          `Unknown idempotency policy id: ${redactWorkerSchedulerValue(policy.idempotencyPolicyId)}`,
        ),
      );
    }

    return diagnostics;
  });

export const redactWorkerSchedulerValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => redactWorkerSchedulerValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (isSensitiveWorkerSchedulerKey(key)) {
          return [key, REDACTED_VALUE];
        }

        return [key, redactWorkerSchedulerValue(nestedValue)];
      }),
    );
  }

  if (typeof value !== "string") {
    return value;
  }

  if (isRawJobPayload(value)) {
    return RAW_JOB_PAYLOAD_VALUE;
  }

  if (isCredentialedUrl(value) || isSensitiveWorkerSchedulerString(value)) {
    return REDACTED_VALUE;
  }

  return value;
};

export const createWorkerSchedulerFoundation = (
  options: CreateWorkerSchedulerFoundationOptions = {},
): WorkerSchedulerFoundationSummary => {
  const env = options.env ?? {};
  const profileResolution = resolveProfile(options.profileId);
  const registryDiagnostics = createRegistryDiagnostics();
  const productionDiagnostics =
    profileResolution.profileId === "production-required" ? createProductionDiagnostics(env) : [];
  const leaseStore = createLeaseStoreSummary(
    createWorkerLeaseStoreFoundation({
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
  const readiness = createReadinessProjection(diagnostics, blockerCount, leaseStore);

  return {
    blockerCount,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: "campaign-os-worker-scheduler-foundation",
    idempotencyPolicies: workerIdempotencyPolicies,
    jobCatalog: workerJobCatalog,
    leaseStore,
    noLiveFlags: workerSchedulerNoLiveFlags,
    preconditions: workerSchedulerProductionPreconditions.map(({ field, message, ...item }) => item),
    productionReady: false,
    profileId: profileResolution.profileId,
    readiness,
    retryBackoffPolicies: workerRetryBackoffPolicies,
    schedulerPolicies: workerSchedulerPolicies,
    status,
    valid: profileResolution.valid && blockerCount === 0,
  };
};

const createReadinessProjection = (
  diagnostics: readonly WorkerSchedulerDiagnostic[],
  blockerCount: number,
  leaseStore: WorkerSchedulerLeaseStoreSummary,
): WorkerSchedulerReadinessProjection => ({
  blockerCount,
  diagnosticCodes: diagnostics.map((item) => item.code),
  jobCatalogCount: workerJobCatalog.length,
  jobFamilyCount: new Set(workerJobCatalog.map((jobItem) => jobItem.family)).size,
  leaseStoreBlockerCount: leaseStore.blockerCount,
  leaseStoreDiagnosticCodes: leaseStore.diagnosticCodes,
  leaseStoreId: leaseStore.storeId,
  leaseStoreLiveQueuePublishingEnabled: false,
  leaseStoreLiveWorkerExecutionEnabled: false,
  leaseStoreMode: leaseStore.mode,
  leaseStoreRequiredConfigKeys: leaseStore.requiredConfigKeys,
  leaseStoreStatus: leaseStore.status,
  liveSchedulerExecutionEnabled: false,
  liveWorkerExecutionEnabled: false,
  localReviewReady: blockerCount === 0,
  productionReady: false,
  schedulePolicyCount: workerSchedulerPolicies.length,
  triggerSourceCount: workerSchedulerTriggerSources.length,
});

const createLeaseStoreSummary = (
  leaseStore: ReturnType<typeof createWorkerLeaseStoreFoundation>,
): WorkerSchedulerLeaseStoreSummary => ({
  adapterId: leaseStore.adapterId,
  blockerCount: leaseStore.blockerCount,
  diagnosticCodes: leaseStore.diagnosticCodes,
  disabledLiveOperationCount: leaseStore.readiness.disabledLiveOperationCount,
  heartbeatIntervalSeconds: leaseStore.readiness.heartbeatIntervalSeconds,
  liveQueuePublishingEnabled: false,
  liveWorkerExecutionEnabled: false,
  mode: leaseStore.mode,
  noLiveFlags: leaseStore.noLiveFlags,
  operationCapabilities: leaseStore.operationCapabilities.map((item) => ({ ...item })),
  operationCount: leaseStore.readiness.operationCount,
  productionReady: false,
  requiredConfigKeys: leaseStore.readiness.requiredConfigKeys,
  status: leaseStore.status,
  storeId: leaseStore.storeId,
  ttlSeconds: leaseStore.readiness.ttlSeconds,
  valid: leaseStore.valid,
});

const resolveStatus = (
  profileId: WorkerSchedulerProfileId,
  blockerCount: number,
): WorkerSchedulerFoundationStatus => {
  if (blockerCount > 0) {
    return "blocked";
  }

  return profileId === "staging-scaffold" ? "scaffolded" : "local_ready";
};

const isSensitiveWorkerSchedulerKey = (key: string): boolean =>
  /bearer|credential|job[-_]?payload|lease[-_]?token|object[-_]?key|payload|provider[-_]?payload|queue[-_]?url|scheduler[-_]?endpoint|secret|signed[-_]?url|token|webhook[-_]?secret/i.test(
    key,
  );

const isSensitiveWorkerSchedulerString = (value: string): boolean =>
  /(bearer\s+|hook-secret|lease-token|object-key|queue-secret|scheduler-pass|secret|token=|worker-token|x-amz-signature=)/i.test(
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

const isRawJobPayload = (value: string): boolean => {
  const trimmed = value.trim();

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return false;
  }

  return /address|job|payload|provider|task|wallet/i.test(trimmed);
};
