import {
  resolveBackendConfigContract,
  type BackendConfigContract,
  type BackendConfigContractOptions,
} from "./config";
import {
  createBackendRuntimeBootstrapContract,
  type BackendRuntimeBootstrapContract,
} from "./backendRuntimeBootstrap";
import { createApiFoundationReport, type ApiFoundationReport } from "./apiFoundation";
import { createApiServicePortReport, type ApiServicePortReport } from "./servicePorts";
import { apiRuntimeRoutes } from "./routes";
import { createBackendTopologyReport, type BackendTopologyReport } from "./topology";
import {
  createMigrationManifest,
  type MigrationManifest,
} from "./migrationManifest";
import type { MigrationExecutionGate } from "./migrationExecutionGate";
import {
  createPersistenceAdapterPortReport,
  type PersistenceAdapterPortReport,
} from "./persistenceAdapterPort";
import {
  createProductionDatabaseAdapterContract,
  type ProductionDatabaseAdapterContract,
  type ProductionDatabaseDiagnostic,
  type ProductionDatabaseStoreRegistryEntry,
} from "./productionDatabase";
import {
  createProductionDatabaseAdapterRuntimeContract,
  type ConnectionPoolState,
  type DatabaseAdapterDeferredDependency,
  type DatabaseAdapterRuntimeDiagnostic,
  type DatabaseAdapterRuntimeStatus,
  type DatabaseAdapterRuntimeStore,
  type DatabaseQueryAdapterSummary,
  type DatabaseTransactionSummary,
  type MigrationExecutorHandoffSummary,
  type ProductionDatabaseAdapterRuntimeContract,
  type ProductionDbRuntimeReadinessProjection,
} from "./databaseAdapterRuntime";
import {
  createDatabaseMigrationExecutorHandoff,
  type DatabaseMigrationExecutorHandoffSummary,
} from "./databaseMigrationHandoff";
import type { MigrationRunnerPlan } from "./migrationRunner";
import {
  createProductionPersistenceRuntimeContract,
  type ConnectionConfigState,
  type DeferredPersistenceDependency,
  type ProductionPersistenceAdapterKind,
  type ProductionPersistenceRuntimeDiagnostic,
  type ProductionPersistenceRuntimeContract,
  type ProductionPersistenceRuntimeStatus,
  type ProductionPersistenceStoreCoverage,
  type TransactionCapabilitySummary,
} from "./persistenceRuntime";
import {
  createAuthSessionReadinessReport,
  createProductionAuthSessionFoundation,
  type AuthSessionReadinessReport,
  type ProductionAuthSessionFoundation,
} from "./authSession";
import {
  createProviderIndexerFoundation,
  type ProviderIndexerFoundationSummary,
} from "./providerIndexerAdapters";
import {
  createProviderIndexerClientReadiness,
  type ProviderClientReadinessSummary,
} from "./providerIndexerClientReadiness";
import type { ProviderHttpRuntimeSummary } from "./providerHttpRuntimeTypes";
import {
  createWorkerSchedulerFoundation,
  type WorkerSchedulerFoundationSummary,
} from "./workerSchedulerRuntime";
import {
  createWorkerLeaseStoreFoundation,
  type WorkerLeaseStoreFoundationSummary,
} from "./workerLeaseStore";
import {
  createWorkerIdempotencyStoreFoundation,
  type WorkerIdempotencyStoreFoundationSummary,
} from "./workerIdempotencyStore";
import {
  createQueueRuntimeFoundation,
  type QueueCategory,
  type QueueRuntimeFoundationSummary,
  type QueueRuntimeProviderAdapterSummary,
} from "./queueRuntime";
import {
  queueProviderAdapterNoLiveFlags,
  type QueueProviderAdapterNoLiveFlags,
} from "./queueProviderAdapter";
import {
  createSchedulerRuntimeFoundation,
  type SchedulerRuntimeFoundationSummary,
} from "./schedulerRuntime";
import {
  createObservabilityExporterFoundation,
  type ObservabilityExporterFoundationSummary,
} from "./observabilityExporter";
import {
  allowedVerificationDegradationOutcomes,
  createVerificationSourceHandoff,
  type VerificationSourceHandoffSummary,
} from "./verificationSourceHandoff";
import {
  createCampaignMigrationState,
  type CampaignMigrationState,
} from "./campaignMigrationState";
import {
  resolveApiServerRuntimeContract,
  type ResolveApiServerRuntimeContractOptions,
} from "./serverRuntime";

export type BackendAttachPointArea =
  | "production-persistence"
  | "auth-session"
  | "provider-adapters"
  | "worker-queue"
  | "worker-lease"
  | "worker-idempotency"
  | "scheduler"
  | "observability"
  | "contract-writer"
  | "object-storage-export"
  | "reward-custody"
  | "reward-distribution"
  | "analytics-warehouse";
export type BackendAttachPointStatus = "local-only" | "scaffold" | "deferred" | "blocked";
export type BackendReadinessDiagnosticCode =
  | "AUTH_SESSION_READINESS_BLOCKED"
  | "BACKEND_CONFIG_BLOCKED"
  | "CAMPAIGN_DB_VERTICAL_SLICE_BLOCKED"
  | "DATABASE_READINESS_BLOCKED"
  | "PROVIDER_INDEXER_READINESS_BLOCKED"
  | "PROVIDER_CLIENT_READINESS_BLOCKED"
  | "PROVIDER_HTTP_RUNTIME_READINESS_BLOCKED"
  | "PERSISTENCE_ADAPTER_INVALID"
  | "MIGRATION_MANIFEST_INVALID"
  | "API_FOUNDATION_INVALID"
  | "TOPOLOGY_INVALID"
  | "SERVICE_PORTS_INVALID"
  | "QUEUE_RUNTIME_READINESS_BLOCKED"
  | "SCHEDULER_RUNTIME_READINESS_BLOCKED"
  | "OBSERVABILITY_EXPORTER_READINESS_BLOCKED"
  | "WORKER_IDEMPOTENCY_STORE_READINESS_BLOCKED"
  | "WORKER_LEASE_STORE_READINESS_BLOCKED"
  | "WORKER_SCHEDULER_READINESS_BLOCKED"
  | "ROUTE_COUNT_MISMATCH"
  | "ATTACH_POINT_MISSING";

export interface BackendAttachPoint {
  area: BackendAttachPointArea;
  attachPoint: string;
  blockedBy: string[];
  currentStatus: BackendAttachPointStatus;
  note: string;
  requiredBeforeProduction: boolean;
}

export interface BackendReadinessDiagnostic {
  code: BackendReadinessDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface BackendServiceEntrypoint {
  foundationValidationValid: boolean;
  id: string;
  label: string;
  profileId: string;
  routeCount: number;
  routeIds: string[];
  runtimeName: string;
  supportMode: string;
  version: string;
}

export type BackendApiServiceBootstrapStatus = "ready" | "blocked" | "deferred";

export interface BackendApiServiceBootstrapSummary {
  authContracts: AuthSessionReadinessReport["authContracts"];
  attachPointCount: number;
  blockedDependencyIds: string[];
  contractWriteEnabled: false;
  deferredDependencyIds: string[];
  deployableBoundaryReady: boolean;
  diagnosticCodes: string[];
  id: "campaign-os-api-service";
  liveConnectionAttempted: false;
  liveSideEffectsEnabled: false;
  productionReady: false;
  profileId: BackendConfigContract["profileId"];
  runtimeVersion: string;
  status: BackendApiServiceBootstrapStatus;
  workerExecutionEnabled: false;
}

export interface BackendServiceReadinessReport {
  apiFoundation: {
    coverage: ApiFoundationReport["coverage"];
    servicePorts: ApiServicePortReport;
    validation: ApiFoundationReport["validation"];
  };
  apiService: BackendApiServiceBootstrapSummary;
  attachMap: BackendAttachPoint[];
  authEnforcement: BackendAuthEnforcementReadinessSummary;
  authSession: AuthSessionReadinessReport;
  authSessionFoundation: ProductionAuthSessionFoundation;
  backendRuntimeBootstrap: BackendRuntimeBootstrapContract;
  campaignDbVerticalSlice: CampaignDbVerticalSliceReadinessSummary;
  config: BackendConfigContract;
  databaseAdapterRuntime: BackendDatabaseAdapterRuntimeReadinessReport;
  databaseReadiness: BackendDatabaseReadinessReport;
  entrypoint: BackendServiceEntrypoint;
  migration: MigrationManifest;
  observabilityExporterFoundation: BackendObservabilityExporterReadinessSummary;
  persistenceFoundation: BackendPersistenceFoundationSummary;
  providerIndexerFoundation: BackendProviderIndexerReadinessSummary;
  providerClientReadiness: BackendProviderClientReadinessSummary;
  queueRuntimeFoundation: BackendQueueRuntimeReadinessSummary;
  workerIdempotencyStoreFoundation: BackendWorkerIdempotencyStoreReadinessSummary;
  workerLeaseStoreFoundation: BackendWorkerLeaseStoreReadinessSummary;
  persistenceRuntime: BackendPersistenceRuntimeReadinessReport;
  persistenceAdapters: PersistenceAdapterPortReport;
  profile: BackendConfigContract["profile"];
  topology: {
    coverage: BackendTopologyReport["coverage"];
    profileReadiness: BackendTopologyReport["profileReadiness"];
    validation: BackendTopologyReport["validation"];
  };
  validation: {
    issues: BackendReadinessDiagnostic[];
    valid: boolean;
  };
  schedulerRuntimeFoundation: BackendSchedulerRuntimeReadinessSummary;
  workerSchedulerFoundation: BackendWorkerSchedulerReadinessSummary;
}

export interface BackendQueueRuntimeReadinessSummary {
  blockerCount: QueueRuntimeFoundationSummary["blockerCount"];
  diagnosticCodes: QueueRuntimeFoundationSummary["diagnosticCodes"];
  diagnostics: QueueRuntimeFoundationSummary["diagnostics"];
  dryRunEnqueue: {
    enabled: QueueRuntimeFoundationSummary["readiness"]["dryRunEnqueueEnabled"];
    livePublishAttempted: false;
    liveQueuePublishingEnabled: false;
  };
  id: QueueRuntimeFoundationSummary["id"];
  noLiveFlags: QueueRuntimeFoundationSummary["noLiveFlags"];
  preconditions: QueueRuntimeFoundationSummary["preconditions"];
  productionReady: false;
  profileId: QueueRuntimeFoundationSummary["profileId"];
  consumingReadiness: BackendQueueConsumingReadinessSummary;
  publishingReadiness: BackendQueuePublishingReadinessSummary;
  providerAdapter: BackendQueueProviderAdapterReadinessSummary;
  queuePlanCoverage: {
    jobIds: string[];
    queueCategories: QueueCategory[];
    queueCategoryCount: QueueRuntimeFoundationSummary["readiness"]["queueCategoryCount"];
    queueIds: string[];
    queuePlanCount: QueueRuntimeFoundationSummary["readiness"]["queuePlanCount"];
    requiredConfigKeys: string[];
  };
  status: QueueRuntimeFoundationSummary["status"];
  valid: boolean;
}

export interface BackendQueuePublishingReadinessSummary {
  activationStatus: QueueRuntimeProviderAdapterSummary["driverPublishingActivationStatus"];
  blockerCount: QueueRuntimeProviderAdapterSummary["driverPublishingBlockerCount"];
  diagnosticCodes: QueueRuntimeProviderAdapterSummary["driverPublishDiagnosticCodes"];
  livePublishAttempted: QueueRuntimeProviderAdapterSummary["driverPublishingLivePublishAttempted"];
  liveQueuePublishingEnabled: QueueRuntimeProviderAdapterSummary["driverPublishingLiveQueuePublishingEnabled"];
  noLiveSideEffects: QueueRuntimeProviderAdapterSummary["driverPublishingNoLiveSideEffects"];
  productionReady: false;
  publishAttemptPolicy: QueueRuntimeProviderAdapterSummary["driverPublishAttemptPolicy"];
  publishRequestEvaluated: QueueRuntimeProviderAdapterSummary["driverPublishRequestEvaluated"];
  publishResultStatus: QueueRuntimeProviderAdapterSummary["driverPublishResultStatus"];
  publisherId: QueueRuntimeProviderAdapterSummary["driverPublishingPublisherId"];
  publisherProvided: QueueRuntimeProviderAdapterSummary["driverPublishingPublisherProvided"];
  requiredConfigKeys: QueueRuntimeProviderAdapterSummary["driverPublishingRequiredConfigKeys"];
  status: QueueRuntimeProviderAdapterSummary["driverPublishingStatus"];
}

export interface BackendQueueConsumingReadinessSummary {
  activationStatus: QueueRuntimeProviderAdapterSummary["driverConsumingActivationStatus"];
  ackAttempted: QueueRuntimeProviderAdapterSummary["driverConsumeAckAttempted"];
  blockerCount: QueueRuntimeProviderAdapterSummary["driverConsumingBlockerCount"];
  consumeAttemptPolicy: QueueRuntimeProviderAdapterSummary["driverConsumeAttemptPolicy"];
  consumeRequestEvaluated: QueueRuntimeProviderAdapterSummary["driverConsumeRequestEvaluated"];
  consumeResultStatus: QueueRuntimeProviderAdapterSummary["driverConsumeResultStatus"];
  consumerId: QueueRuntimeProviderAdapterSummary["driverConsumingConsumerId"];
  consumerProvided: QueueRuntimeProviderAdapterSummary["driverConsumingConsumerProvided"];
  deadLetterAttempted: QueueRuntimeProviderAdapterSummary["driverConsumeDeadLetterAttempted"];
  diagnosticCodes: QueueRuntimeProviderAdapterSummary["driverConsumeDiagnosticCodes"];
  handlerRegistryProvided: QueueRuntimeProviderAdapterSummary["driverConsumingHandlerRegistryProvided"];
  liveConsumeAttempted: QueueRuntimeProviderAdapterSummary["driverConsumingLiveConsumeAttempted"];
  liveQueueConsumptionEnabled: QueueRuntimeProviderAdapterSummary["driverConsumingLiveQueueConsumptionEnabled"];
  nackAttempted: QueueRuntimeProviderAdapterSummary["driverConsumeNackAttempted"];
  noLiveSideEffects: QueueRuntimeProviderAdapterSummary["driverConsumingNoLiveSideEffects"];
  productionReady: false;
  requiredConfigKeys: QueueRuntimeProviderAdapterSummary["driverConsumingRequiredConfigKeys"];
  retryScheduled: QueueRuntimeProviderAdapterSummary["driverConsumeRetryScheduled"];
  status: QueueRuntimeProviderAdapterSummary["driverConsumingStatus"];
}

export interface BackendQueueProviderAdapterReadinessSummary {
  adapterId: QueueRuntimeProviderAdapterSummary["adapterId"];
  blockerCount: QueueRuntimeProviderAdapterSummary["blockerCount"];
  diagnosticCodes: QueueRuntimeProviderAdapterSummary["diagnosticCodes"];
  disabledLiveOperationCount: QueueRuntimeProviderAdapterSummary["disabledLiveOperationCount"];
  driverActivationGateSatisfied: QueueRuntimeProviderAdapterSummary["driverActivationGateSatisfied"];
  driverBlockerCount: QueueRuntimeProviderAdapterSummary["driverBlockerCount"];
  driverDiagnosticCodes: QueueRuntimeProviderAdapterSummary["driverDiagnosticCodes"];
  driverDisabledLiveOperationCount: number;
  driverId: QueueRuntimeProviderAdapterSummary["driverId"];
  driverLiveQueueConsumptionEnabled: false;
  driverLiveQueuePublishingEnabled: false;
  driverLiveWorkerExecutionEnabled: false;
  driverMode: QueueRuntimeProviderAdapterSummary["driverMode"];
  driverOperationCount: QueueRuntimeProviderAdapterSummary["driverOperationCount"];
  driverProductionReady: false;
  driverProviderId: QueueRuntimeProviderAdapterSummary["driverProviderId"];
  driverConsumeAckAttempted: QueueRuntimeProviderAdapterSummary["driverConsumeAckAttempted"];
  driverConsumeAttemptPolicy: QueueRuntimeProviderAdapterSummary["driverConsumeAttemptPolicy"];
  driverConsumeDeadLetterAttempted: QueueRuntimeProviderAdapterSummary["driverConsumeDeadLetterAttempted"];
  driverConsumeDiagnosticCodes: QueueRuntimeProviderAdapterSummary["driverConsumeDiagnosticCodes"];
  driverConsumeNackAttempted: QueueRuntimeProviderAdapterSummary["driverConsumeNackAttempted"];
  driverConsumeRequestEvaluated: QueueRuntimeProviderAdapterSummary["driverConsumeRequestEvaluated"];
  driverConsumeResultStatus: QueueRuntimeProviderAdapterSummary["driverConsumeResultStatus"];
  driverConsumeRetryScheduled: QueueRuntimeProviderAdapterSummary["driverConsumeRetryScheduled"];
  driverConsumingActivationStatus: QueueRuntimeProviderAdapterSummary["driverConsumingActivationStatus"];
  driverConsumingBlockerCount: QueueRuntimeProviderAdapterSummary["driverConsumingBlockerCount"];
  driverConsumingConsumerId: QueueRuntimeProviderAdapterSummary["driverConsumingConsumerId"];
  driverConsumingConsumerProvided: QueueRuntimeProviderAdapterSummary["driverConsumingConsumerProvided"];
  driverConsumingHandlerRegistryProvided: QueueRuntimeProviderAdapterSummary["driverConsumingHandlerRegistryProvided"];
  driverConsumingLiveConsumeAttempted: QueueRuntimeProviderAdapterSummary["driverConsumingLiveConsumeAttempted"];
  driverConsumingLiveQueueConsumptionEnabled: QueueRuntimeProviderAdapterSummary["driverConsumingLiveQueueConsumptionEnabled"];
  driverConsumingNoLiveSideEffects: QueueRuntimeProviderAdapterSummary["driverConsumingNoLiveSideEffects"];
  driverConsumingProductionReady: false;
  driverConsumingRequiredConfigKeys: QueueRuntimeProviderAdapterSummary["driverConsumingRequiredConfigKeys"];
  driverConsumingStatus: QueueRuntimeProviderAdapterSummary["driverConsumingStatus"];
  driverPublishAttemptPolicy: QueueRuntimeProviderAdapterSummary["driverPublishAttemptPolicy"];
  driverPublishDiagnosticCodes: QueueRuntimeProviderAdapterSummary["driverPublishDiagnosticCodes"];
  driverPublishRequestEvaluated: QueueRuntimeProviderAdapterSummary["driverPublishRequestEvaluated"];
  driverPublishResultStatus: QueueRuntimeProviderAdapterSummary["driverPublishResultStatus"];
  driverPublishingActivationStatus: QueueRuntimeProviderAdapterSummary["driverPublishingActivationStatus"];
  driverPublishingBlockerCount: QueueRuntimeProviderAdapterSummary["driverPublishingBlockerCount"];
  driverPublishingLivePublishAttempted: QueueRuntimeProviderAdapterSummary["driverPublishingLivePublishAttempted"];
  driverPublishingLiveQueuePublishingEnabled: QueueRuntimeProviderAdapterSummary["driverPublishingLiveQueuePublishingEnabled"];
  driverPublishingNoLiveSideEffects: QueueRuntimeProviderAdapterSummary["driverPublishingNoLiveSideEffects"];
  driverPublishingPublisherId: QueueRuntimeProviderAdapterSummary["driverPublishingPublisherId"];
  driverPublishingPublisherProvided: QueueRuntimeProviderAdapterSummary["driverPublishingPublisherProvided"];
  driverPublishingRequiredConfigKeys: QueueRuntimeProviderAdapterSummary["driverPublishingRequiredConfigKeys"];
  driverPublishingStatus: QueueRuntimeProviderAdapterSummary["driverPublishingStatus"];
  driverRequiredConfigKeys: QueueRuntimeProviderAdapterSummary["driverRequiredConfigKeys"];
  driverSdkBindingActivationGateSatisfied: boolean;
  driverSdkBindingBlockerCount: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["blockerCount"];
  driverSdkBindingDiagnosticCodes: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["diagnosticCodes"];
  driverSdkBindingDisabledLiveOperationCount: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["disabledLiveOperationCount"];
  driverSdkBindingId: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["bindingId"];
  driverSdkBindingLiveProviderCallAttempted: false;
  driverSdkBindingLiveQueuePublishingEnabled: false;
  driverSdkBindingLiveWorkerExecutionEnabled: false;
  driverSdkBindingMode: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["mode"];
  driverSdkBindingOperationCount: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["operationCount"];
  driverSdkBindingPackageBindingBrokerConnectionBlockerCount: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["brokerConnectionBlockerCount"];
  driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["brokerConnectionDiagnosticCodes"];
  driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["brokerConnectionHealthCheckMode"];
  driverSdkBindingPackageBindingBrokerConnectionId: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["brokerConnectionId"];
  driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["brokerConnectionRequiredConfigKeys"];
  driverSdkBindingPackageBindingBrokerConnectionStatus: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["brokerConnectionStatus"];
  driverSdkBindingPackageBindingBlockerCount: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["blockerCount"];
  driverSdkBindingPackageBindingBrowserBundleAllowed: false;
  driverSdkBindingPackageBindingBullmqConstructionAttempted: boolean;
  driverSdkBindingPackageBindingBullmqConstructionBlockerCount: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["bullmqConstructionBlockerCount"];
  driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["bullmqConstructionDiagnosticCodes"];
  driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: boolean;
  driverSdkBindingPackageBindingBullmqConstructionId: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["bullmqConstructionId"];
  driverSdkBindingPackageBindingBullmqConstructionProductionReady: false;
  driverSdkBindingPackageBindingBullmqConstructionStatus: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["bullmqConstructionStatus"];
  driverSdkBindingPackageBindingDiagnosticCodes: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["diagnosticCodes"];
  driverSdkBindingPackageBindingFamily: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["family"];
  driverSdkBindingPackageBindingId: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["bindingId"];
  driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false;
  driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false;
  driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false;
  driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false;
  driverSdkBindingPackageBindingPackageName: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["packageName"];
  driverSdkBindingPackageBindingPackageRef: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["packageRef"];
  driverSdkBindingPackageBindingQueueClientConstructed: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["queueClientConstructed"];
  driverSdkBindingPackageBindingQueueEventsConstructed: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["queueEventsConstructed"];
  driverSdkBindingPackageBindingSdkClientConstructed: false;
  driverSdkBindingPackageBindingStatus: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["status"];
  driverSdkBindingPackageBindingWorkerConstructed: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["packageBinding"]["workerConstructed"];
  driverSdkBindingProductionReady: false;
  driverSdkBindingProviderKind: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["providerKind"];
  driverSdkBindingQueueRouteCount: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["queueRouteCount"];
  driverSdkBindingRequiredConfigKeys: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["requiredConfigKeys"];
  driverSdkBindingSdkClientConstructed: false;
  driverSdkBindingSdkPackageRef: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["sdkPackageRef"];
  driverSdkBindingStatus: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["status"];
  driverSdkBindingValid: QueueRuntimeProviderAdapterSummary["driverSdkBinding"]["valid"];
  driverStatus: QueueRuntimeProviderAdapterSummary["driverStatus"];
  driverValid: QueueRuntimeProviderAdapterSummary["driverValid"];
  liveQueueConsumptionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: QueueRuntimeProviderAdapterSummary["mode"];
  noLiveFlags: QueueProviderAdapterNoLiveFlags;
  operationCount: QueueRuntimeProviderAdapterSummary["operationCount"];
  productionReady: false;
  providerId: QueueRuntimeProviderAdapterSummary["providerId"];
  requiredConfigKeys: QueueRuntimeProviderAdapterSummary["requiredConfigKeys"];
  status: QueueRuntimeProviderAdapterSummary["status"];
  valid: boolean;
}

export interface BackendSchedulerRuntimeReadinessSummary {
  blockerCount: SchedulerRuntimeFoundationSummary["blockerCount"];
  diagnosticCodes: SchedulerRuntimeFoundationSummary["diagnosticCodes"];
  diagnostics: SchedulerRuntimeFoundationSummary["diagnostics"];
  dryRunTrigger: {
    enabled: SchedulerRuntimeFoundationSummary["readiness"]["dryRunTriggerEnabled"];
    liveCronExecutionEnabled: false;
    liveQueuePublishingEnabled: false;
    liveSchedulerExecutionEnabled: false;
  };
  id: SchedulerRuntimeFoundationSummary["id"];
  noLiveFlags: SchedulerRuntimeFoundationSummary["noLiveFlags"];
  preconditions: SchedulerRuntimeFoundationSummary["preconditions"];
  productionReady: false;
  profileId: SchedulerRuntimeFoundationSummary["profileId"];
  registrationCoverage: {
    jobFamilies: string[];
    jobIds: string[];
    registrationCount: SchedulerRuntimeFoundationSummary["readiness"]["registrationCount"];
    requiredConfigKeys: string[];
    scheduleIds: string[];
    triggerSourceCount: SchedulerRuntimeFoundationSummary["readiness"]["triggerSourceCount"];
  };
  status: SchedulerRuntimeFoundationSummary["status"];
  valid: boolean;
}

export interface BackendProviderIndexerReadinessSummary extends ProviderIndexerFoundationSummary {
  degradationPolicy: {
    allowedOutcomes: typeof allowedVerificationDegradationOutcomes;
    providerBackedUnavailableOutcomes: string[];
  };
  requiredConfigKeys: string[];
  verificationSourceDiagnosticCodes: VerificationSourceHandoffSummary["diagnosticCodes"];
  verificationSourceDiagnostics: VerificationSourceHandoffSummary["diagnostics"];
  verificationSourceHandoff: VerificationSourceHandoffSummary;
}

export interface BackendProviderClientReadinessSummary extends ProviderClientReadinessSummary {
  activationInventory: {
    activationStatus: ProviderClientReadinessSummary["activationStatus"];
    blockedConfigKeys: string[];
    blockerIds: string[];
    providerHttpRuntime: {
      activationStatus: ProviderHttpRuntimeSummary["activationStatus"];
      blockedConfigKeys: string[];
      blockerIds: string[];
      endpointRollout: ProviderHttpRuntimeSummary["endpointRollout"];
      runtimeId: ProviderHttpRuntimeSummary["id"];
      status: ProviderHttpRuntimeSummary["status"];
    };
    redacted: true;
    requiredConfigKeys: string[];
  };
}

export interface BackendWorkerSchedulerReadinessSummary {
  blockerCount: WorkerSchedulerFoundationSummary["blockerCount"];
  diagnosticCodes: WorkerSchedulerFoundationSummary["diagnosticCodes"];
  diagnostics: WorkerSchedulerFoundationSummary["diagnostics"];
  id: WorkerSchedulerFoundationSummary["id"];
  jobCatalogCoverage: {
    jobCatalogCount: number;
    jobFamilyCount: number;
    ownerServiceIds: string[];
    productionDependencyIds: string[];
    requiredConfigKeys: string[];
    triggerSourceCount: number;
  };
  noLiveFlags: WorkerSchedulerFoundationSummary["noLiveFlags"];
  preconditions: WorkerSchedulerFoundationSummary["preconditions"];
  productionReady: false;
  profileId: WorkerSchedulerFoundationSummary["profileId"];
  schedulePolicyCoverage: {
    idempotencyPolicyCount: number;
    retryPolicyCount: number;
    schedulePolicyCount: number;
  };
  providerHttpRuntime: WorkerSchedulerFoundationSummary["providerHttpRuntime"];
  status: WorkerSchedulerFoundationSummary["status"];
  valid: boolean;
  verificationSourceHandoff: {
    id: VerificationSourceHandoffSummary["id"];
    liveExecutionEnabled: false;
    supportedVerificationTypes: VerificationSourceHandoffSummary["supportedVerificationTypes"];
    valid: boolean;
    workerRequiredPolicyCount: number;
  };
}

export interface BackendWorkerLeaseStoreReadinessSummary {
  adapterId: WorkerLeaseStoreFoundationSummary["adapterId"];
  blockerCount: WorkerLeaseStoreFoundationSummary["blockerCount"];
  diagnosticCodes: WorkerLeaseStoreFoundationSummary["diagnosticCodes"];
  diagnostics: WorkerLeaseStoreFoundationSummary["diagnostics"];
  disabledLiveOperationCount: WorkerLeaseStoreFoundationSummary["readiness"]["disabledLiveOperationCount"];
  heartbeatIntervalSeconds: WorkerLeaseStoreFoundationSummary["readiness"]["heartbeatIntervalSeconds"];
  id: WorkerLeaseStoreFoundationSummary["id"];
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: WorkerLeaseStoreFoundationSummary["mode"];
  noLiveFlags: WorkerLeaseStoreFoundationSummary["noLiveFlags"];
  operationCount: WorkerLeaseStoreFoundationSummary["readiness"]["operationCount"];
  preconditions: WorkerLeaseStoreFoundationSummary["preconditions"];
  productionReady: false;
  profileId: WorkerLeaseStoreFoundationSummary["profileId"];
  requiredConfigKeys: string[];
  status: WorkerLeaseStoreFoundationSummary["status"];
  storeId: WorkerLeaseStoreFoundationSummary["storeId"];
  ttlSeconds: WorkerLeaseStoreFoundationSummary["readiness"]["ttlSeconds"];
  valid: boolean;
}

export interface BackendWorkerIdempotencyStoreReadinessSummary {
  adapterId: WorkerIdempotencyStoreFoundationSummary["adapterId"];
  blockerCount: WorkerIdempotencyStoreFoundationSummary["blockerCount"];
  diagnosticCodes: WorkerIdempotencyStoreFoundationSummary["diagnosticCodes"];
  diagnostics: WorkerIdempotencyStoreFoundationSummary["diagnostics"];
  disabledLiveOperationCount: WorkerIdempotencyStoreFoundationSummary["readiness"]["disabledLiveOperationCount"];
  id: WorkerIdempotencyStoreFoundationSummary["id"];
  keySchemaVersion: WorkerIdempotencyStoreFoundationSummary["keySchemaVersion"];
  liveIdempotencyExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: WorkerIdempotencyStoreFoundationSummary["mode"];
  namespace: WorkerIdempotencyStoreFoundationSummary["namespace"];
  noLiveFlags: WorkerIdempotencyStoreFoundationSummary["noLiveFlags"];
  operationCount: WorkerIdempotencyStoreFoundationSummary["readiness"]["operationCount"];
  preconditions: WorkerIdempotencyStoreFoundationSummary["preconditions"];
  productionReady: false;
  profileId: WorkerIdempotencyStoreFoundationSummary["profileId"];
  requiredConfigKeys: string[];
  status: WorkerIdempotencyStoreFoundationSummary["status"];
  storeId: WorkerIdempotencyStoreFoundationSummary["storeId"];
  valid: boolean;
}

export interface BackendObservabilityExporterReadinessSummary {
  adapterId: ObservabilityExporterFoundationSummary["adapterId"];
  blockerCount: ObservabilityExporterFoundationSummary["blockerCount"];
  diagnosticCodes: ObservabilityExporterFoundationSummary["diagnosticCodes"];
  diagnostics: ObservabilityExporterFoundationSummary["diagnostics"];
  disabledLiveOperationCount: ObservabilityExporterFoundationSummary["readiness"]["disabledLiveOperationCount"];
  exporterId: ObservabilityExporterFoundationSummary["exporterId"];
  id: ObservabilityExporterFoundationSummary["id"];
  liveAlertRoutingEnabled: false;
  liveLogExportEnabled: false;
  liveMetricsExportEnabled: false;
  liveTelemetryExportEnabled: false;
  liveTraceExportEnabled: false;
  metricNamespace: ObservabilityExporterFoundationSummary["metricNamespace"];
  mode: ObservabilityExporterFoundationSummary["mode"];
  noLiveFlags: ObservabilityExporterFoundationSummary["noLiveFlags"];
  operationCount: ObservabilityExporterFoundationSummary["readiness"]["operationCount"];
  preconditions: ObservabilityExporterFoundationSummary["preconditions"];
  productionReady: false;
  profileId: ObservabilityExporterFoundationSummary["profileId"];
  requiredConfigKeys: string[];
  sinkId: ObservabilityExporterFoundationSummary["sinkId"];
  status: ObservabilityExporterFoundationSummary["status"];
  valid: boolean;
}

export type BackendAuthEnforcementMode = "blocked" | "local_enforced" | "metadata_only";

export interface BackendAuthEnforcementReadinessSummary {
  agentCredentialSubstitutionDisabled: boolean;
  campaignMutationRouteCount: number;
  liveSigningExecuted: false;
  liveVerificationExecuted: false;
  localEnforcedRouteCount: number;
  localProofVerifierContractReady: true;
  localSessionIssuerContractReady: true;
  locallyEnforcedRouteIds: string[];
  mode: BackendAuthEnforcementMode;
  productionProofVerifierReady: false;
  productionProjectOwnershipSourceReady: false;
  productionSessionIssuerReady: false;
  protectedRouteCount: number;
  readOnlyRouteCompatibility: {
    campaignReadRouteIds: string[];
    runtimeMetadataRouteIds: string[];
    runtimeMetadataUnauthenticated: boolean;
  };
  remainingDeferredProductionDependencyIds: string[];
}

export type CampaignDbVerticalSliceStatus = "ready" | "blocked";
export type CampaignDbVerticalSliceDiagnosticCode =
  | "CAMPAIGN_DB_DURABLE_STORE_BLOCKED"
  | "CAMPAIGN_DB_LIVE_DRIVER_MISSING"
  | "CAMPAIGN_DB_MIGRATION_STATE_BLOCKED"
  | "CAMPAIGN_DB_MIGRATION_EXECUTOR_UNAPPROVED"
  | "CAMPAIGN_DB_SECRET_MANAGER_MISSING"
  | "CAMPAIGN_DB_PRODUCTION_WRITE_DISABLED"
  | "CAMPAIGN_DB_DETERMINISTIC_ADAPTER_NOT_PRODUCTION_READY";

export interface CampaignDbVerticalSliceDiagnostic {
  code: CampaignDbVerticalSliceDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface CampaignDbVerticalSliceReadinessSummary {
  adapter: {
    deterministic: boolean;
    id: string;
    productionReady: boolean;
    status: BackendDatabaseAdapterRuntimeReadinessReport["status"];
  };
  capabilities: {
    deterministicLifecycle: true;
    recordDraft: boolean;
    readDraft: boolean;
    writeDraft: boolean;
  };
  campaignStore: {
    boundedListLimit: number;
    durable: boolean;
    fallbackUsed: false;
    mode: "local_seeded" | "durable_test" | "production_required";
    recordCount: number;
    status: CampaignDbVerticalSliceStatus;
    storeId: "campaign-db";
  };
  diagnosticCodes: CampaignDbVerticalSliceDiagnosticCode[];
  diagnostics: CampaignDbVerticalSliceDiagnostic[];
  id: "campaign-db-vertical-slice";
  lifecycle: {
    readinessDoesNotMutateRecords: true;
    repositoryContractStatus: "available" | "blocked";
    repositoryMode: "deterministic_test" | "durable_test" | "production_deferred";
  };
  migrationState: CampaignMigrationState;
  noLive: {
    connectionAttempted: false;
    migrationExecutionEnabled: false;
    queryExecutionEnabled: false;
    writeExecutionEnabled: false;
  };
  productionActivationBlockers: string[];
  profileId: BackendConfigContract["profileId"];
  repositoryContract: {
    createDraft: true;
    getById: true;
    health: true;
    list: true;
    reset: true;
  };
  status: CampaignDbVerticalSliceStatus;
  storeId: "campaign-db";
  validation: {
    issues: CampaignDbVerticalSliceDiagnostic[];
    valid: boolean;
  };
}

export interface BackendPersistenceRuntimeReadinessReport extends ProductionPersistenceRuntimeContract {
  migrationGate: MigrationExecutionGate;
}

export interface BackendDatabaseAdapterRuntimeReadinessReport extends ProductionDatabaseAdapterRuntimeContract {
  migrationHandoff: DatabaseMigrationExecutorHandoffSummary;
}

export interface BackendDatabaseAdapterRuntimeSummary {
  connectionPool: {
    configuredKeyCount: number;
    diagnosticCodes: string[];
    liveConnectionAttempted: false;
    missingKeys: string[];
    redactedFields: string[];
    requiredKeys: string[];
    safeLabel: string;
    state: ConnectionPoolState;
  };
  connectionPoolState: ConnectionPoolState;
  deferredDependencies: DatabaseAdapterDeferredDependency[];
  deferredDependencyIds: string[];
  diagnosticCodes: string[];
  diagnostics: DatabaseAdapterRuntimeDiagnostic[];
  driverId: string;
  liveConnectionAttempted: false;
  liveQueryExecutionEnabled: false;
  migrationExecutor: MigrationExecutorHandoffSummary & {
    handoffDiagnosticCodes: string[];
    handoffDiagnostics: DatabaseMigrationExecutorHandoffSummary["diagnostics"];
    handoffId: DatabaseMigrationExecutorHandoffSummary["id"];
    handoffPreconditions: DatabaseMigrationExecutorHandoffSummary["preconditions"];
    handoffStatus: DatabaseMigrationExecutorHandoffSummary["executorStatus"];
    handoffValid: boolean;
    migrationGateStatus: DatabaseMigrationExecutorHandoffSummary["migrationGateStatus"];
  };
  profileId: BackendConfigContract["profileId"];
  productionDbRuntime: BackendProductionDbRuntimeSummary;
  providerId: string;
  queryAdapter: DatabaseQueryAdapterSummary;
  requiredStoreCount: number;
  status: DatabaseAdapterRuntimeStatus;
  stores: DatabaseAdapterRuntimeStore[];
  transaction: DatabaseTransactionSummary;
  valid: boolean;
}

export interface BackendProductionDbRuntimeSummary {
  connectionState: ProductionDbRuntimeReadinessProjection["connectionState"];
  diagnosticCodes: ProductionDbRuntimeReadinessProjection["diagnosticCodes"];
  driverId: ProductionDbRuntimeReadinessProjection["driverId"];
  driverProductionReady: boolean;
  id: ProductionDbRuntimeReadinessProjection["id"];
  liveConnectionAttempted: false;
  liveQueryExecutionEnabled: false;
  migrationGateStatus: ProductionDbRuntimeReadinessProjection["migrationGateStatus"];
  ownerStoreCount: number;
  profileId: ProductionDbRuntimeReadinessProjection["profileId"];
  providerId: ProductionDbRuntimeReadinessProjection["providerId"];
  schemaManifestId: ProductionDbRuntimeReadinessProjection["schemaManifestId"];
  status: ProductionDbRuntimeReadinessProjection["status"];
  valid: boolean;
}

export interface BackendPersistenceRuntimeSummary {
  activeDriverId: string;
  adapterKind: ProductionPersistenceAdapterKind;
  connection: {
    configuredKeyCount: number;
    missingKeys: string[];
    redactedFields: string[];
    requiredKeys: string[];
    safeLabel: string;
    state: ConnectionConfigState;
  };
  connectionState: ConnectionConfigState;
  deferredDependencies: DeferredPersistenceDependency[];
  deferredDependencyIds: string[];
  diagnosticCodes: string[];
  diagnostics: ProductionPersistenceRuntimeDiagnostic[];
  liveConnectionAttempted: false;
  liveExecutionEnabled: false;
  migrationGate: {
    approval: MigrationExecutionGate["approval"];
    blockedMigrationIds: string[];
    diagnosticCodes: string[];
    diagnostics: MigrationExecutionGate["diagnostics"];
    liveExecutionCount: 0;
    liveExecutionEnabled: false;
    mode: MigrationExecutionGate["mode"];
    pendingMigrationIds: string[];
    preconditions: MigrationExecutionGate["preconditions"];
    status: MigrationExecutionGate["status"];
  };
  migrationGateMode: MigrationExecutionGate["mode"];
  migrationGateStatus: MigrationExecutionGate["status"];
  profileId: BackendConfigContract["profileId"];
  requestedDriverId?: string;
  requiredStoreCount: number;
  status: ProductionPersistenceRuntimeStatus;
  stores: ProductionPersistenceStoreCoverage[];
  supportMode: string;
  transaction: TransactionCapabilitySummary;
  valid: boolean;
}

export type BackendPersistenceFoundationStatus = "metadata_ready" | "blocked";

export interface BackendPersistenceFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  foundationId: ProductionPersistenceRuntimeContract["foundationId"];
  liveConnectionAttempted: false;
  liveMigrationExecutionEnabled: false;
  liveQueryExecutionEnabled: false;
  migrationDryRun: {
    liveMigrationExecutionEnabled: false;
    migrationGateStatus: MigrationExecutionGate["status"];
    noLiveMigrationCommand: true;
    runnerStatus: MigrationManifest["runnerStatus"];
    status: MigrationRunnerPlan["status"];
  };
  productionBlockerIds: string[];
  productionReady: false;
  requiredStoreCount: number;
  status: BackendPersistenceFoundationStatus;
  storeCoverage: {
    coverageComplete: boolean;
    coveredStoreCount: number;
    requiredStoreCount: number;
    storeIds: string[];
  };
  storeCoverageCount: number;
  valid: boolean;
}

export interface BackendDatabaseReadinessReport {
  adapter: ProductionDatabaseAdapterContract;
  migrationPlan: MigrationRunnerPlan;
  stores: ProductionDatabaseStoreRegistryEntry[];
  validation: {
    issues: Array<ProductionDatabaseDiagnostic | MigrationRunnerPlan["diagnostics"][number]>;
    valid: boolean;
  };
}

export interface CampaignDbVerticalSliceStoreReadinessInput {
  boundedListLimit?: number;
  durable?: boolean;
  mode?: "local_seeded" | "durable_test" | "production_required";
  recordCount?: number;
  status?: CampaignDbVerticalSliceStatus;
}

export interface CreateBackendServiceReadinessReportOptions {
  campaignStore?: CampaignDbVerticalSliceStoreReadinessInput;
  configOptions?: BackendConfigContractOptions;
  generatedAt?: string;
  serverRuntimeOptions?: Partial<ResolveApiServerRuntimeContractOptions>;
}

const requiredAttachPointAreas: BackendAttachPointArea[] = [
  "production-persistence",
  "auth-session",
  "provider-adapters",
  "worker-queue",
  "worker-lease",
  "worker-idempotency",
  "scheduler",
  "observability",
  "contract-writer",
  "object-storage-export",
  "reward-custody",
  "reward-distribution",
  "analytics-warehouse",
];

const apiServiceBlockedDependencyIds = [
  "live-database-driver",
  "migration-executor",
  "project-membership-store",
  "contract-writer",
  "reward-custody",
  "reward-distribution",
] as const;

const apiServiceDeferredDependencyIds = [
  "verification-worker",
  "worker-lease-store",
  "scheduler",
  "provider-adapters",
  "object-storage",
  "analytics-ingestion",
  "deployment-config",
  "observability-exporter",
] as const;

export const backendAttachMap: BackendAttachPoint[] = [
  {
    area: "production-persistence",
    attachPoint: "src/server/persistence.ts:createCampaignOsRepository",
    blockedBy: ["production database adapter mission", "migration runner mission"],
    currentStatus: "blocked",
    note: "Current memory/local JSON adapters stay active; production DB adapter is metadata-only.",
    requiredBeforeProduction: true,
  },
  {
    area: "auth-session",
    attachPoint: "src/server/authSession.ts:createAuthSessionReadinessReport",
    blockedBy: [
      "live wallet signature verifier",
      "auth nonce store",
      "JWT or session cookie issuer",
      "session signing key",
      "secret manager",
      "production session store",
      "RBAC enforcement",
      "project ownership source",
      "admin organization model",
      "agent credential provider",
    ],
    currentStatus: "local-only",
    note: "Local wallet proof verifier, local opaque session issuer contracts, and sanitized wallet session repository records are ready; live verification, signing, secret manager, production session store, and ownership source remain production blockers.",
    requiredBeforeProduction: true,
  },
  {
    area: "provider-adapters",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["provider adapter registry mission", "service degradation policy"],
    currentStatus: "deferred",
    note: "AeFinder, AelfScan, dApp, social, AI, wallet, and analytics providers remain deferred.",
    requiredBeforeProduction: true,
  },
  {
    area: "worker-queue",
    attachPoint: "src/server/backendService.ts",
    blockedBy: ["worker runtime mission", "queue provider selection"],
    currentStatus: "deferred",
    note: "No background processor or queue consumer runs in this scaffold.",
    requiredBeforeProduction: true,
  },
  {
    area: "worker-lease",
    attachPoint: "src/server/workerLeaseStore.ts",
    blockedBy: [
      "lease store selection",
      "lease store endpoint",
      "lease credentials",
      "clock source",
      "heartbeat policy",
      "TTL policy",
      "release policy",
      "stale recovery policy",
      "fencing policy",
      "idempotency coordination",
      "observability exporter",
    ],
    currentStatus: "deferred",
    note: "Worker lease readiness is metadata-only; no live lease claim, heartbeat, release, fencing, or recovery runs.",
    requiredBeforeProduction: true,
  },
  {
    area: "worker-idempotency",
    attachPoint: "src/server/workerIdempotencyStore.ts",
    blockedBy: [
      "idempotency store selection",
      "idempotency store endpoint",
      "idempotency store credentials",
      "namespace",
      "key schema version",
      "retention policy",
      "conflict policy",
      "completion policy",
      "clock source",
      "worker lease coordination",
      "observability exporter",
    ],
    currentStatus: "deferred",
    note: "Worker idempotency readiness is metadata-only; no live idempotency claim, completion, replay, or stale recovery runs.",
    requiredBeforeProduction: true,
  },
  {
    area: "scheduler",
    attachPoint: "src/server/backendService.ts",
    blockedBy: ["scheduler runtime mission", "retry/backoff policy"],
    currentStatus: "deferred",
    note: "No cron, delayed job, or scheduled campaign processor runs in this scaffold.",
    requiredBeforeProduction: true,
  },
  {
    area: "observability",
    attachPoint: "src/server/observabilityExporter.ts",
    blockedBy: [
      "exporter selection",
      "exporter endpoint",
      "exporter credentials",
      "metrics sink registration",
      "metric namespace",
      "retention policy",
      "trace collector",
      "structured log sink",
      "alert routing",
      "retry/dead-letter policy",
      "redaction policy",
      "operator runbook",
    ],
    currentStatus: "deferred",
    note: "Observability exporter readiness is dry-run metadata only; no live telemetry, metrics, logs, traces, alerts, retry, or dead-letter export runs.",
    requiredBeforeProduction: true,
  },
  {
    area: "contract-writer",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["contract writer mission", "wallet signer policy", "contract ops review"],
    currentStatus: "blocked",
    note: "Contract writes, reward roots, and on-chain mutation are explicitly disabled.",
    requiredBeforeProduction: true,
  },
  {
    area: "object-storage-export",
    attachPoint: "src/server/persistenceAdapterPort.ts",
    blockedBy: ["object storage adapter mission", "signed URL safety review"],
    currentStatus: "deferred",
    note: "Exports remain local previews; storage-backed fulfillment is not active.",
    requiredBeforeProduction: true,
  },
  {
    area: "reward-custody",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["reward custody mission", "finance/security review"],
    currentStatus: "blocked",
    note: "Reward custody and escrow are not implemented by the backend scaffold.",
    requiredBeforeProduction: true,
  },
  {
    area: "reward-distribution",
    attachPoint: "src/server/servicePorts.ts",
    blockedBy: ["reward distribution mission", "contract writer mission"],
    currentStatus: "blocked",
    note: "No payout, claim, or reward distribution flow is active.",
    requiredBeforeProduction: true,
  },
  {
    area: "analytics-warehouse",
    attachPoint: "src/server/persistenceAdapterPort.ts",
    blockedBy: ["analytics warehouse adapter mission", "event ingestion contract"],
    currentStatus: "deferred",
    note: "Current analytics are local/read-model only; warehouse ingestion is deferred.",
    requiredBeforeProduction: true,
  },
];

const errorDiagnostic = (
  code: BackendReadinessDiagnosticCode,
  field: string,
  message: string,
): BackendReadinessDiagnostic => ({
  code,
  field,
  message,
  severity: "error",
});

const createBackendAuthEnforcementReadinessSummary = (
  authSession: AuthSessionReadinessReport,
): BackendAuthEnforcementReadinessSummary => {
  const locallyEnforcedRoutes = authSession.protectedRoutes.filter(
    (route) => route.enforcementStatus === "local_enforced",
  );
  const campaignMutationRoutes = authSession.protectedRoutes.filter(
    (route) => route.routeGroup === "campaign_write",
  );
  const runtimeMetadataRoutes = authSession.protectedRoutes.filter(
    (route) => route.routeGroup === "runtime_metadata",
  );
  const readOnlyRouteIds = apiRuntimeRoutes
    .filter((route) => route.method === "GET" && route.serviceGroup === "campaign")
    .map((route) => route.id);

  return {
    agentCredentialSubstitutionDisabled:
      authSession.agentCredentialBoundary.agentSkillCanSubstituteUserWallet === false
      && authSession.agentCredentialBoundary.separatedFromUserWalletSession,
    campaignMutationRouteCount: campaignMutationRoutes.length,
    liveSigningExecuted: authSession.authContracts.sessionIssuer.liveSigningExecuted,
    liveVerificationExecuted: authSession.authContracts.proofVerifier.liveVerificationExecuted,
    localEnforcedRouteCount: locallyEnforcedRoutes.length,
    localProofVerifierContractReady: authSession.authContracts.proofVerifier.localContractReady,
    localSessionIssuerContractReady: authSession.authContracts.sessionIssuer.localContractReady,
    locallyEnforcedRouteIds: locallyEnforcedRoutes.map((route) => route.routeId),
    mode: authSession.validation.valid && locallyEnforcedRoutes.length > 0
      ? "local_enforced"
      : authSession.validation.valid
        ? "metadata_only"
        : "blocked",
    productionProofVerifierReady: false,
    productionProjectOwnershipSourceReady: false,
    productionSessionIssuerReady: false,
    protectedRouteCount: authSession.protectedRouteCount,
    readOnlyRouteCompatibility: {
      campaignReadRouteIds: readOnlyRouteIds,
      runtimeMetadataRouteIds: runtimeMetadataRoutes.map((route) => route.routeId),
      runtimeMetadataUnauthenticated: runtimeMetadataRoutes.every(
        (route) => route.enforcementStatus === "not_required" && !route.sessionRequired,
      ),
    },
    remainingDeferredProductionDependencyIds: [...authSession.deferredDependencyIds],
  };
};

const createValidationIssues = ({
  apiFoundation,
  attachMap,
  authSession,
  campaignDbVerticalSlice,
  config,
  databaseAdapterRuntime,
  databaseReadiness,
  entrypoint,
  migration,
  observabilityExporterFoundation,
  persistenceAdapters,
  providerIndexerFoundation,
  providerClientReadiness,
  queueRuntimeFoundation,
  schedulerRuntimeFoundation,
  workerIdempotencyStoreFoundation,
  workerLeaseStoreFoundation,
  workerSchedulerFoundation,
  persistenceRuntime,
  servicePorts,
  topology,
}: {
  apiFoundation: ApiFoundationReport;
  attachMap: readonly BackendAttachPoint[];
  authSession: AuthSessionReadinessReport;
  campaignDbVerticalSlice: CampaignDbVerticalSliceReadinessSummary;
  config: BackendConfigContract;
  databaseAdapterRuntime: BackendDatabaseAdapterRuntimeReadinessReport;
  databaseReadiness: BackendDatabaseReadinessReport;
  entrypoint: BackendServiceEntrypoint;
  migration: MigrationManifest;
  observabilityExporterFoundation: BackendObservabilityExporterReadinessSummary;
  persistenceAdapters: PersistenceAdapterPortReport;
  providerIndexerFoundation: BackendProviderIndexerReadinessSummary;
  providerClientReadiness: BackendProviderClientReadinessSummary;
  queueRuntimeFoundation: BackendQueueRuntimeReadinessSummary;
  schedulerRuntimeFoundation: BackendSchedulerRuntimeReadinessSummary;
  workerIdempotencyStoreFoundation: BackendWorkerIdempotencyStoreReadinessSummary;
  workerLeaseStoreFoundation: BackendWorkerLeaseStoreReadinessSummary;
  persistenceRuntime: BackendPersistenceRuntimeReadinessReport;
  servicePorts: ApiServicePortReport;
  topology: BackendTopologyReport;
  workerSchedulerFoundation: BackendWorkerSchedulerReadinessSummary;
}): BackendReadinessDiagnostic[] => {
  const issues: BackendReadinessDiagnostic[] = [];

  if (!config.valid) {
    issues.push(errorDiagnostic("BACKEND_CONFIG_BLOCKED", "config", "Backend config contract is blocked."));
  }

  if (!authSession.validation.valid) {
    issues.push(errorDiagnostic(
      "AUTH_SESSION_READINESS_BLOCKED",
      "authSession",
      "Auth/session readiness validation failed.",
    ));
  }

  if (!campaignDbVerticalSlice.validation.valid) {
    issues.push(errorDiagnostic(
      "CAMPAIGN_DB_VERTICAL_SLICE_BLOCKED",
      "campaignDbVerticalSlice",
      "Campaign DB vertical slice readiness validation failed.",
    ));
  }

  if (!databaseReadiness.validation.valid) {
    issues.push(errorDiagnostic(
      "DATABASE_READINESS_BLOCKED",
      "databaseReadiness",
      "Production database or migration readiness validation failed.",
    ));
  }

  if (!databaseAdapterRuntime.valid || !databaseAdapterRuntime.migrationHandoff.valid) {
    issues.push(errorDiagnostic(
      "DATABASE_READINESS_BLOCKED",
      "databaseAdapterRuntime",
      "Production database adapter runtime validation failed.",
    ));
  }

  if (!providerIndexerFoundation.valid || !providerIndexerFoundation.verificationSourceHandoff.valid) {
    issues.push(errorDiagnostic(
      "PROVIDER_INDEXER_READINESS_BLOCKED",
      "providerIndexerFoundation",
      "Provider/indexer readiness validation failed.",
    ));
  }

  if (!providerClientReadiness.valid) {
    issues.push(errorDiagnostic(
      "PROVIDER_CLIENT_READINESS_BLOCKED",
      "providerClientReadiness",
      "Provider/indexer client readiness validation failed.",
    ));
  }

  if (
    providerClientReadiness.profileId === "production-required"
    && providerClientReadiness.providerHttpRuntime.status !== "activated"
  ) {
    issues.push(errorDiagnostic(
      "PROVIDER_HTTP_RUNTIME_READINESS_BLOCKED",
      "providerClientReadiness.providerHttpRuntime",
      "Provider HTTP runtime readiness is blocked before production activation.",
    ));
  }

  if (!queueRuntimeFoundation.valid) {
    issues.push(errorDiagnostic(
      "QUEUE_RUNTIME_READINESS_BLOCKED",
      "queueRuntimeFoundation",
      "Queue runtime foundation readiness validation failed.",
    ));
  }

  if (!schedulerRuntimeFoundation.valid) {
    issues.push(errorDiagnostic(
      "SCHEDULER_RUNTIME_READINESS_BLOCKED",
      "schedulerRuntimeFoundation",
      "Scheduler runtime foundation readiness validation failed.",
    ));
  }

  if (
    !observabilityExporterFoundation.valid
    || observabilityExporterFoundation.liveAlertRoutingEnabled
    || observabilityExporterFoundation.liveLogExportEnabled
    || observabilityExporterFoundation.liveMetricsExportEnabled
    || observabilityExporterFoundation.liveTelemetryExportEnabled
    || observabilityExporterFoundation.liveTraceExportEnabled
  ) {
    issues.push(errorDiagnostic(
      "OBSERVABILITY_EXPORTER_READINESS_BLOCKED",
      "observabilityExporterFoundation",
      "Observability exporter readiness validation failed or live export flags are enabled.",
    ));
  }

  if (!workerIdempotencyStoreFoundation.valid) {
    issues.push(errorDiagnostic(
      "WORKER_IDEMPOTENCY_STORE_READINESS_BLOCKED",
      "workerIdempotencyStoreFoundation",
      "Worker idempotency store readiness validation failed.",
    ));
  }

  if (!workerLeaseStoreFoundation.valid) {
    issues.push(errorDiagnostic(
      "WORKER_LEASE_STORE_READINESS_BLOCKED",
      "workerLeaseStoreFoundation",
      "Worker lease store readiness validation failed.",
    ));
  }

  if (!workerSchedulerFoundation.valid) {
    issues.push(errorDiagnostic(
      "WORKER_SCHEDULER_READINESS_BLOCKED",
      "workerSchedulerFoundation",
      "Worker/scheduler readiness validation failed.",
    ));
  }

  if (!persistenceAdapters.validation.valid) {
    issues.push(
      errorDiagnostic("PERSISTENCE_ADAPTER_INVALID", "persistenceAdapters", "Persistence adapter port validation failed."),
    );
  }

  if (!persistenceRuntime.valid || persistenceRuntime.migrationGate.status === "blocked") {
    issues.push(
      errorDiagnostic(
        "PERSISTENCE_ADAPTER_INVALID",
        "persistenceRuntime",
        "Production persistence runtime validation failed.",
      ),
    );
  }

  if (!migration.validation.valid) {
    issues.push(errorDiagnostic("MIGRATION_MANIFEST_INVALID", "migration", "Migration manifest validation failed."));
  }

  if (!apiFoundation.validation.valid) {
    issues.push(errorDiagnostic("API_FOUNDATION_INVALID", "apiFoundation", "API foundation validation failed."));
  }

  if (!topology.validation.valid) {
    issues.push(errorDiagnostic("TOPOLOGY_INVALID", "topology", "Backend topology validation failed."));
  }

  if (!servicePorts.validation.valid) {
    issues.push(errorDiagnostic("SERVICE_PORTS_INVALID", "servicePorts", "API service port validation failed."));
  }

  if (entrypoint.routeCount !== apiFoundation.coverage.routeCount) {
    issues.push(
      errorDiagnostic(
        "ROUTE_COUNT_MISMATCH",
        "entrypoint.routeCount",
        "Backend entrypoint route count must match API foundation route count.",
      ),
    );
  }

  const attachPointAreas = new Set(attachMap.map((item) => item.area));
  for (const area of requiredAttachPointAreas) {
    if (!attachPointAreas.has(area)) {
      issues.push(errorDiagnostic("ATTACH_POINT_MISSING", area, `Missing backend attach point for ${area}.`));
    }
  }

  return issues;
};

const createDatabaseReadinessReport = ({
  migration,
  profileId,
}: {
  migration: MigrationManifest;
  profileId: BackendConfigContract["profileId"];
}): BackendDatabaseReadinessReport => {
  const adapter = createProductionDatabaseAdapterContract({ profileId });
  const issues = [
    ...adapter.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    ...migration.runnerPlan.validation.issues,
  ];

  return {
    adapter,
    migrationPlan: migration.runnerPlan,
    stores: adapter.stores,
    validation: {
      issues,
      valid: issues.every((issue) => issue.severity !== "error"),
    },
  };
};

const createApiServiceBootstrapSummary = ({
  authSession,
  backendRuntimeBootstrap,
  config,
  validationIssues,
}: {
  authSession: AuthSessionReadinessReport;
  backendRuntimeBootstrap: BackendRuntimeBootstrapContract;
  config: BackendConfigContract;
  validationIssues: readonly BackendReadinessDiagnostic[];
}): BackendApiServiceBootstrapSummary => {
  const blockingIssueCount = [
    ...backendRuntimeBootstrap.diagnostics,
    ...validationIssues,
  ].filter((issue) => issue.severity === "error").length;
  const status: BackendApiServiceBootstrapStatus =
    blockingIssueCount > 0 || config.profileId === "production-required"
      ? "blocked"
      : backendRuntimeBootstrap.status === "deferred"
        ? "deferred"
        : "ready";
  const diagnosticCodes = Array.from(new Set([
    ...backendRuntimeBootstrap.diagnosticCodes,
    ...validationIssues.map((issue) => issue.code),
    ...(config.profileId === "production-required" ? ["API_SERVICE_PRODUCTION_BLOCKED"] : []),
  ]));

  return {
    authContracts: authSession.authContracts,
    attachPointCount: apiServiceBlockedDependencyIds.length + apiServiceDeferredDependencyIds.length,
    blockedDependencyIds: [...apiServiceBlockedDependencyIds],
    contractWriteEnabled: false,
    deferredDependencyIds: [...apiServiceDeferredDependencyIds],
    deployableBoundaryReady: status === "ready",
    diagnosticCodes,
    id: "campaign-os-api-service",
    liveConnectionAttempted: false,
    liveSideEffectsEnabled: false,
    productionReady: false,
    profileId: config.profileId,
    runtimeVersion: config.version,
    status,
    workerExecutionEnabled: false,
  };
};

const campaignDbVerticalSliceDiagnostic = (
  code: CampaignDbVerticalSliceDiagnosticCode,
  field: string,
  message: string,
): CampaignDbVerticalSliceDiagnostic => ({
  code,
  field,
  message,
  severity: "error",
});

const createCampaignDbVerticalSliceReadinessSummary = ({
  campaignStore,
  config,
  databaseAdapterRuntime,
  migration,
  persistenceRuntime,
}: {
  campaignStore?: CampaignDbVerticalSliceStoreReadinessInput;
  config: BackendConfigContract;
  databaseAdapterRuntime: BackendDatabaseAdapterRuntimeReadinessReport;
  migration: MigrationManifest;
  persistenceRuntime: BackendPersistenceRuntimeReadinessReport;
}): CampaignDbVerticalSliceReadinessSummary => {
  const productionRequired = config.profileId === "production-required";
  const deterministicAdapter = databaseAdapterRuntime.transaction.mode === "deterministic_test";
  const requestedStoreMode = productionRequired ? "production_required" : campaignStore?.mode ?? "local_seeded";
  const storeDurable = campaignStore?.durable ?? requestedStoreMode === "durable_test";
  const migrationState = createCampaignMigrationState({
    migration,
    productionRequired,
  });
  const productionDiagnostics = productionRequired
    ? [
        campaignDbVerticalSliceDiagnostic(
          "CAMPAIGN_DB_LIVE_DRIVER_MISSING",
          "databaseAdapterRuntime.driverId",
          "Production-required Campaign DB needs an approved live driver before activation.",
        ),
        campaignDbVerticalSliceDiagnostic(
          "CAMPAIGN_DB_MIGRATION_EXECUTOR_UNAPPROVED",
          "migration.executionGate.approval",
          "Production-required Campaign DB needs an approved migration executor before activation.",
        ),
        campaignDbVerticalSliceDiagnostic(
          "CAMPAIGN_DB_SECRET_MANAGER_MISSING",
          "persistenceRuntime.connection",
          "Production-required Campaign DB needs secret manager and connection pool integration.",
        ),
        campaignDbVerticalSliceDiagnostic(
          "CAMPAIGN_DB_PRODUCTION_WRITE_DISABLED",
          "databaseAdapterRuntime.transaction.liveCommitEnabled",
          "Production Campaign DB writes remain disabled until live write activation is explicitly approved.",
        ),
        campaignDbVerticalSliceDiagnostic(
          "CAMPAIGN_DB_DETERMINISTIC_ADAPTER_NOT_PRODUCTION_READY",
          "databaseAdapterRuntime.adapter",
          "Deterministic/local Campaign DB adapter is not production-ready.",
        ),
      ]
    : [];
  const storeStatus = campaignStore?.status ?? (productionRequired ? "blocked" : "ready");
  const storeDiagnostics =
    storeStatus === "blocked"
      ? [
        campaignDbVerticalSliceDiagnostic(
          "CAMPAIGN_DB_DURABLE_STORE_BLOCKED",
          "campaignStore.status",
          "Campaign DB durable store readiness is blocked.",
        ),
      ]
      : [];
  const migrationStateDiagnostics = migrationState.validation.valid
    ? []
    : [
      campaignDbVerticalSliceDiagnostic(
        "CAMPAIGN_DB_MIGRATION_STATE_BLOCKED",
        "migrationState.status",
        "Campaign DB migration state is blocked.",
      ),
    ];
  const diagnostics = [
    ...productionDiagnostics,
    ...storeDiagnostics,
    ...migrationStateDiagnostics,
  ];
  const status =
    diagnostics.length === 0 && migrationState.validation.valid && storeStatus === "ready" ? "ready" : "blocked";

  return {
    adapter: {
      deterministic: deterministicAdapter,
      id: databaseAdapterRuntime.driverId,
      productionReady: false,
      status: databaseAdapterRuntime.status,
    },
    capabilities: {
      deterministicLifecycle: true,
      recordDraft: !productionRequired,
      readDraft: !productionRequired,
      writeDraft: !productionRequired,
    },
    campaignStore: {
      boundedListLimit: campaignStore?.boundedListLimit ?? 100,
      durable: storeDurable,
      fallbackUsed: false,
      mode: requestedStoreMode,
      recordCount: campaignStore?.recordCount ?? 0,
      status,
      storeId: "campaign-db",
    },
    diagnosticCodes: diagnostics.map((diagnostic) => diagnostic.code),
    diagnostics,
    id: "campaign-db-vertical-slice",
    lifecycle: {
      readinessDoesNotMutateRecords: true,
      repositoryContractStatus: status === "ready" ? "available" : "blocked",
      repositoryMode: productionRequired
        ? "production_deferred"
        : requestedStoreMode === "durable_test"
          ? "durable_test"
          : "deterministic_test",
    },
    migrationState,
    noLive: {
      connectionAttempted: databaseAdapterRuntime.liveConnectionAttempted,
      migrationExecutionEnabled: migration.executionGate.liveExecutionEnabled,
      queryExecutionEnabled: databaseAdapterRuntime.liveQueryExecutionEnabled,
      writeExecutionEnabled: persistenceRuntime.migrationGate.liveExecutionEnabled,
    },
    productionActivationBlockers: diagnostics.map((diagnostic) => diagnostic.message),
    profileId: config.profileId,
    repositoryContract: {
      createDraft: true,
      getById: true,
      health: true,
      list: true,
      reset: true,
    },
    status,
    storeId: "campaign-db",
    validation: {
      issues: diagnostics,
      valid: status === "ready",
    },
  };
};

export const createBackendPersistenceRuntimeSummary = (
  runtime: BackendPersistenceRuntimeReadinessReport,
): BackendPersistenceRuntimeSummary => ({
  activeDriverId: runtime.activeDriverId,
  adapterKind: runtime.adapterKind,
  connection: {
    configuredKeyCount: runtime.connection.configuredKeys.length,
    missingKeys: runtime.connection.missingKeys,
    redactedFields: runtime.connection.redactedFields,
    requiredKeys: runtime.connection.requiredKeys,
    safeLabel: runtime.connection.safeLabel,
    state: runtime.connection.state,
  },
  connectionState: runtime.connection.state,
  deferredDependencies: runtime.deferredDependencies,
  deferredDependencyIds: runtime.deferredDependencies.map((dependency) => dependency.id),
  diagnosticCodes: runtime.diagnostics.map((diagnostic) => diagnostic.code),
  diagnostics: runtime.diagnostics,
  liveConnectionAttempted: runtime.liveConnectionAttempted,
  liveExecutionEnabled: runtime.migrationGate.liveExecutionEnabled,
  migrationGate: {
    approval: runtime.migrationGate.approval,
    blockedMigrationIds: runtime.migrationGate.blockedMigrationIds,
    diagnosticCodes: runtime.migrationGate.diagnostics.map((diagnostic) => diagnostic.code),
    diagnostics: runtime.migrationGate.diagnostics,
    liveExecutionCount: runtime.migrationGate.liveExecutionCount,
    liveExecutionEnabled: runtime.migrationGate.liveExecutionEnabled,
    mode: runtime.migrationGate.mode,
    pendingMigrationIds: runtime.migrationGate.pendingMigrationIds,
    preconditions: runtime.migrationGate.preconditions,
    status: runtime.migrationGate.status,
  },
  migrationGateMode: runtime.migrationGate.mode,
  migrationGateStatus: runtime.migrationGate.status,
  profileId: runtime.profileId,
  requestedDriverId: runtime.requestedDriverId,
  requiredStoreCount: runtime.stores.filter((store) => store.required).length,
  status: runtime.status,
  stores: runtime.stores,
  supportMode: runtime.supportMode,
  transaction: runtime.transaction,
  valid: runtime.valid,
});

const uniqueDiagnosticCodes = (
  codes: readonly string[],
): string[] => Array.from(new Set(codes));

const createAuthSessionObservedInput = (
  env: Record<string, string | undefined>,
) => Object.fromEntries(
  Object.entries({
    authorization: env.AUTHORIZATION,
    authSecret: env.CAMPAIGN_OS_AUTH_SECRET,
  }).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
);

export const createBackendPersistenceFoundationSummary = ({
  databaseAdapterRuntime,
  migration,
  persistenceRuntime,
}: {
  databaseAdapterRuntime: BackendDatabaseAdapterRuntimeReadinessReport;
  migration: MigrationManifest;
  persistenceRuntime: BackendPersistenceRuntimeReadinessReport;
}): BackendPersistenceFoundationSummary => {
  const requiredStores = persistenceRuntime.stores.filter((store) => store.required);
  const coveredStores = requiredStores.filter((store) => store.runtimeState === "covered");
  const coverageComplete = coveredStores.length === requiredStores.length;
  const diagnosticCodes = uniqueDiagnosticCodes([
    ...persistenceRuntime.diagnostics.map((diagnostic) => diagnostic.code),
    ...persistenceRuntime.migrationGate.diagnostics.map((diagnostic) => diagnostic.code),
    ...databaseAdapterRuntime.diagnostics.map((diagnostic) => diagnostic.code),
    ...databaseAdapterRuntime.connectionPool.diagnosticCodes,
    ...databaseAdapterRuntime.migrationExecutor.diagnosticCodes,
    ...databaseAdapterRuntime.migrationHandoff.diagnosticCodes,
    ...databaseAdapterRuntime.productionDbRuntime.diagnosticCodes,
    ...migration.runnerPlan.diagnostics.map((diagnostic) => diagnostic.code),
    ...migration.executionGate.diagnostics.map((diagnostic) => diagnostic.code),
    ...migration.validation.issues.map((issue) => issue.code),
  ]);
  const valid =
    coverageComplete
    && persistenceRuntime.valid
    && databaseAdapterRuntime.valid
    && databaseAdapterRuntime.migrationHandoff.valid
    && migration.validation.valid
    && migration.executionGate.status !== "blocked";

  return {
    blockerCount: persistenceRuntime.productionBlockers.length,
    diagnosticCodes,
    foundationId: persistenceRuntime.foundationId,
    liveConnectionAttempted: false,
    liveMigrationExecutionEnabled: false,
    liveQueryExecutionEnabled: false,
    migrationDryRun: {
      liveMigrationExecutionEnabled: false,
      migrationGateStatus: migration.executionGate.status,
      noLiveMigrationCommand: migration.noLiveMigrationCommand,
      runnerStatus: migration.runnerStatus,
      status: migration.runnerPlan.status,
    },
    productionBlockerIds: persistenceRuntime.productionBlockers.map((dependency) => dependency.id),
    productionReady: persistenceRuntime.productionReady,
    requiredStoreCount: requiredStores.length,
    status: valid ? "metadata_ready" : "blocked",
    storeCoverage: {
      coverageComplete,
      coveredStoreCount: coveredStores.length,
      requiredStoreCount: requiredStores.length,
      storeIds: coveredStores.map((store) => store.id),
    },
    storeCoverageCount: coveredStores.length,
    valid,
  };
};

const createBackendProviderIndexerReadinessSummary = ({
  env,
  profileId,
}: {
  env: Record<string, string | undefined>;
  profileId: BackendConfigContract["profileId"];
}): BackendProviderIndexerReadinessSummary => {
  const foundation = createProviderIndexerFoundation({
    env,
    profileId,
  });
  const verificationSourceHandoff = createVerificationSourceHandoff();
  const requiredConfigKeys = Array.from(
    new Set(foundation.providerGroups.flatMap((group) => group.requiredConfigKeys)),
  );
  const providerBackedUnavailableOutcomes = Array.from(
    new Set(
      verificationSourceHandoff.entries
        .filter((entry) => entry.workerRequired)
        .map((entry) => entry.unavailableDegradationOutcome),
    ),
  );

  return {
    ...foundation,
    degradationPolicy: {
      allowedOutcomes: allowedVerificationDegradationOutcomes,
      providerBackedUnavailableOutcomes,
    },
    requiredConfigKeys,
    valid: foundation.valid && verificationSourceHandoff.valid,
    verificationSourceDiagnosticCodes: verificationSourceHandoff.diagnosticCodes,
    verificationSourceDiagnostics: verificationSourceHandoff.diagnostics,
    verificationSourceHandoff,
  };
};

const createBackendProviderClientReadinessSummary = ({
  env,
  profileId,
}: {
  env: Record<string, string | undefined>;
  profileId: BackendConfigContract["profileId"];
}): BackendProviderClientReadinessSummary => {
  const readiness = createProviderIndexerClientReadiness({
    env,
    profileId,
  });
  const diagnosticCodeSet = new Set(readiness.diagnosticCodes);
  const providerHttpDiagnosticCodeSet = new Set(readiness.providerHttpRuntime.diagnosticCodes);
  const blockerPreconditions = readiness.preconditions.filter((precondition) =>
    diagnosticCodeSet.has(precondition.diagnosticCode)
  );
  const providerHttpBlockerPreconditions = readiness.providerHttpRuntime.preconditions.filter((precondition) =>
    providerHttpDiagnosticCodeSet.has(precondition.diagnosticCode)
  );

  return {
    ...readiness,
    activationInventory: {
      activationStatus: readiness.activationStatus,
      blockedConfigKeys: uniqueStrings(
        blockerPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
      ),
      blockerIds: blockerPreconditions.map((precondition) => precondition.id),
      providerHttpRuntime: {
        activationStatus: readiness.providerHttpRuntime.activationStatus,
        blockedConfigKeys: uniqueStrings(
          providerHttpBlockerPreconditions.flatMap((precondition) => precondition.requiredConfigKeys),
        ),
        blockerIds: providerHttpBlockerPreconditions.map((precondition) => precondition.id),
        endpointRollout: readiness.providerHttpRuntime.endpointRollout,
        runtimeId: readiness.providerHttpRuntime.id,
        status: readiness.providerHttpRuntime.status,
      },
      redacted: true,
      requiredConfigKeys: readiness.requiredConfigKeys,
    },
  };
};

const uniqueStrings = (values: readonly string[]): string[] => Array.from(new Set(values));

const createBackendQueueRuntimeReadinessSummary = ({
  env,
  profileId,
}: {
  env: Record<string, string | undefined>;
  profileId: BackendConfigContract["profileId"];
}): BackendQueueRuntimeReadinessSummary => {
  const foundation = createQueueRuntimeFoundation({
    env,
    profileId,
  });

  return {
    blockerCount: foundation.blockerCount,
    diagnosticCodes: foundation.diagnosticCodes,
    diagnostics: foundation.diagnostics,
    dryRunEnqueue: {
      enabled: foundation.readiness.dryRunEnqueueEnabled,
      livePublishAttempted: false,
      liveQueuePublishingEnabled: foundation.readiness.liveQueuePublishingEnabled,
    },
    id: foundation.id,
    noLiveFlags: foundation.noLiveFlags,
    preconditions: foundation.preconditions,
    productionReady: foundation.productionReady,
    profileId: foundation.profileId,
    consumingReadiness: {
      activationStatus: foundation.providerAdapter.driverConsumingActivationStatus,
      ackAttempted: foundation.providerAdapter.driverConsumeAckAttempted,
      blockerCount: foundation.providerAdapter.driverConsumingBlockerCount,
      consumeAttemptPolicy: foundation.providerAdapter.driverConsumeAttemptPolicy,
      consumeRequestEvaluated: foundation.providerAdapter.driverConsumeRequestEvaluated,
      consumeResultStatus: foundation.providerAdapter.driverConsumeResultStatus,
      consumerId: foundation.providerAdapter.driverConsumingConsumerId,
      consumerProvided: foundation.providerAdapter.driverConsumingConsumerProvided,
      deadLetterAttempted: foundation.providerAdapter.driverConsumeDeadLetterAttempted,
      diagnosticCodes: foundation.providerAdapter.driverConsumeDiagnosticCodes,
      handlerRegistryProvided: foundation.providerAdapter.driverConsumingHandlerRegistryProvided,
      liveConsumeAttempted: foundation.providerAdapter.driverConsumingLiveConsumeAttempted,
      liveQueueConsumptionEnabled: foundation.providerAdapter.driverConsumingLiveQueueConsumptionEnabled,
      nackAttempted: foundation.providerAdapter.driverConsumeNackAttempted,
      noLiveSideEffects: foundation.providerAdapter.driverConsumingNoLiveSideEffects,
      productionReady: false,
      requiredConfigKeys: foundation.providerAdapter.driverConsumingRequiredConfigKeys,
      retryScheduled: foundation.providerAdapter.driverConsumeRetryScheduled,
      status: foundation.providerAdapter.driverConsumingStatus,
    },
    publishingReadiness: {
      activationStatus: foundation.providerAdapter.driverPublishingActivationStatus,
      blockerCount: foundation.providerAdapter.driverPublishingBlockerCount,
      diagnosticCodes: foundation.providerAdapter.driverPublishDiagnosticCodes,
      livePublishAttempted: foundation.providerAdapter.driverPublishingLivePublishAttempted,
      liveQueuePublishingEnabled: foundation.providerAdapter.driverPublishingLiveQueuePublishingEnabled,
      noLiveSideEffects: foundation.providerAdapter.driverPublishingNoLiveSideEffects,
      productionReady: false,
      publishAttemptPolicy: foundation.providerAdapter.driverPublishAttemptPolicy,
      publishRequestEvaluated: foundation.providerAdapter.driverPublishRequestEvaluated,
      publishResultStatus: foundation.providerAdapter.driverPublishResultStatus,
      publisherId: foundation.providerAdapter.driverPublishingPublisherId,
      publisherProvided: foundation.providerAdapter.driverPublishingPublisherProvided,
      requiredConfigKeys: foundation.providerAdapter.driverPublishingRequiredConfigKeys,
      status: foundation.providerAdapter.driverPublishingStatus,
    },
    providerAdapter: {
      adapterId: foundation.providerAdapter.adapterId,
      blockerCount: foundation.providerAdapter.blockerCount,
      diagnosticCodes: foundation.providerAdapter.diagnosticCodes,
      disabledLiveOperationCount: foundation.providerAdapter.disabledLiveOperationCount,
      driverActivationGateSatisfied: foundation.providerAdapter.driverActivationGateSatisfied,
      driverBlockerCount: foundation.providerAdapter.driverBlockerCount,
      driverDiagnosticCodes: foundation.providerAdapter.driverDiagnosticCodes,
      driverDisabledLiveOperationCount: foundation.providerAdapter.driverOperationCapabilities.filter(
        (operation) => operation.liveEnabled === false,
      ).length,
      driverId: foundation.providerAdapter.driverId,
      driverLiveQueueConsumptionEnabled: foundation.providerAdapter.driverLiveQueueConsumptionEnabled,
      driverLiveQueuePublishingEnabled: foundation.providerAdapter.driverLiveQueuePublishingEnabled,
      driverLiveWorkerExecutionEnabled: foundation.providerAdapter.driverLiveWorkerExecutionEnabled,
      driverMode: foundation.providerAdapter.driverMode,
      driverOperationCount: foundation.providerAdapter.driverOperationCount,
      driverProductionReady: foundation.providerAdapter.driverProductionReady,
      driverProviderId: foundation.providerAdapter.driverProviderId,
      driverConsumeAckAttempted: foundation.providerAdapter.driverConsumeAckAttempted,
      driverConsumeAttemptPolicy: foundation.providerAdapter.driverConsumeAttemptPolicy,
      driverConsumeDeadLetterAttempted: foundation.providerAdapter.driverConsumeDeadLetterAttempted,
      driverConsumeDiagnosticCodes: foundation.providerAdapter.driverConsumeDiagnosticCodes,
      driverConsumeNackAttempted: foundation.providerAdapter.driverConsumeNackAttempted,
      driverConsumeRequestEvaluated: foundation.providerAdapter.driverConsumeRequestEvaluated,
      driverConsumeResultStatus: foundation.providerAdapter.driverConsumeResultStatus,
      driverConsumeRetryScheduled: foundation.providerAdapter.driverConsumeRetryScheduled,
      driverConsumingActivationStatus: foundation.providerAdapter.driverConsumingActivationStatus,
      driverConsumingBlockerCount: foundation.providerAdapter.driverConsumingBlockerCount,
      driverConsumingConsumerId: foundation.providerAdapter.driverConsumingConsumerId,
      driverConsumingConsumerProvided: foundation.providerAdapter.driverConsumingConsumerProvided,
      driverConsumingHandlerRegistryProvided: foundation.providerAdapter.driverConsumingHandlerRegistryProvided,
      driverConsumingLiveConsumeAttempted: foundation.providerAdapter.driverConsumingLiveConsumeAttempted,
      driverConsumingLiveQueueConsumptionEnabled: foundation.providerAdapter.driverConsumingLiveQueueConsumptionEnabled,
      driverConsumingNoLiveSideEffects: foundation.providerAdapter.driverConsumingNoLiveSideEffects,
      driverConsumingProductionReady: false,
      driverConsumingRequiredConfigKeys: foundation.providerAdapter.driverConsumingRequiredConfigKeys,
      driverConsumingStatus: foundation.providerAdapter.driverConsumingStatus,
      driverPublishAttemptPolicy: foundation.providerAdapter.driverPublishAttemptPolicy,
      driverPublishDiagnosticCodes: foundation.providerAdapter.driverPublishDiagnosticCodes,
      driverPublishRequestEvaluated: foundation.providerAdapter.driverPublishRequestEvaluated,
      driverPublishResultStatus: foundation.providerAdapter.driverPublishResultStatus,
      driverPublishingActivationStatus: foundation.providerAdapter.driverPublishingActivationStatus,
      driverPublishingBlockerCount: foundation.providerAdapter.driverPublishingBlockerCount,
      driverPublishingLivePublishAttempted: foundation.providerAdapter.driverPublishingLivePublishAttempted,
      driverPublishingLiveQueuePublishingEnabled: foundation.providerAdapter.driverPublishingLiveQueuePublishingEnabled,
      driverPublishingNoLiveSideEffects: foundation.providerAdapter.driverPublishingNoLiveSideEffects,
      driverPublishingPublisherId: foundation.providerAdapter.driverPublishingPublisherId,
      driverPublishingPublisherProvided: foundation.providerAdapter.driverPublishingPublisherProvided,
      driverPublishingRequiredConfigKeys: foundation.providerAdapter.driverPublishingRequiredConfigKeys,
      driverPublishingStatus: foundation.providerAdapter.driverPublishingStatus,
      driverRequiredConfigKeys: foundation.providerAdapter.driverRequiredConfigKeys,
      driverSdkBindingActivationGateSatisfied: foundation.providerAdapter.driverSdkBinding.activationGateSatisfied,
      driverSdkBindingBlockerCount: foundation.providerAdapter.driverSdkBinding.blockerCount,
      driverSdkBindingDiagnosticCodes: foundation.providerAdapter.driverSdkBinding.diagnosticCodes,
      driverSdkBindingDisabledLiveOperationCount: foundation.providerAdapter.driverSdkBinding.disabledLiveOperationCount,
      driverSdkBindingId: foundation.providerAdapter.driverSdkBinding.bindingId,
      driverSdkBindingLiveProviderCallAttempted: foundation.providerAdapter.driverSdkBinding.liveProviderCallAttempted,
      driverSdkBindingLiveQueuePublishingEnabled: foundation.providerAdapter.driverSdkBinding.liveQueuePublishingEnabled,
      driverSdkBindingLiveWorkerExecutionEnabled: foundation.providerAdapter.driverSdkBinding.liveWorkerExecutionEnabled,
      driverSdkBindingMode: foundation.providerAdapter.driverSdkBinding.mode,
      driverSdkBindingOperationCount: foundation.providerAdapter.driverSdkBinding.operationCount,
      driverSdkBindingPackageBindingBrokerConnectionBlockerCount: foundation.providerAdapter.driverSdkBinding.packageBinding.brokerConnectionBlockerCount,
      driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: foundation.providerAdapter.driverSdkBinding.packageBinding.brokerConnectionDiagnosticCodes,
      driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: foundation.providerAdapter.driverSdkBinding.packageBinding.brokerConnectionHealthCheckMode,
      driverSdkBindingPackageBindingBrokerConnectionId: foundation.providerAdapter.driverSdkBinding.packageBinding.brokerConnectionId,
      driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: foundation.providerAdapter.driverSdkBinding.packageBinding.brokerConnectionRequiredConfigKeys,
      driverSdkBindingPackageBindingBrokerConnectionStatus: foundation.providerAdapter.driverSdkBinding.packageBinding.brokerConnectionStatus,
      driverSdkBindingPackageBindingBlockerCount: foundation.providerAdapter.driverSdkBinding.packageBinding.blockerCount,
      driverSdkBindingPackageBindingBrowserBundleAllowed: false,
      driverSdkBindingPackageBindingBullmqConstructionAttempted: foundation.providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionAttempted,
      driverSdkBindingPackageBindingBullmqConstructionBlockerCount: foundation.providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionBlockerCount,
      driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: foundation.providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionDiagnosticCodes,
      driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: foundation.providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionFactoryInvoked,
      driverSdkBindingPackageBindingBullmqConstructionId: foundation.providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionId,
      driverSdkBindingPackageBindingBullmqConstructionProductionReady: false,
      driverSdkBindingPackageBindingBullmqConstructionStatus: foundation.providerAdapter.driverSdkBinding.packageBinding.bullmqConstructionStatus,
      driverSdkBindingPackageBindingDiagnosticCodes: foundation.providerAdapter.driverSdkBinding.packageBinding.diagnosticCodes,
      driverSdkBindingPackageBindingFamily: foundation.providerAdapter.driverSdkBinding.packageBinding.family,
      driverSdkBindingPackageBindingId: foundation.providerAdapter.driverSdkBinding.packageBinding.bindingId,
      driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
      driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false,
      driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
      driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
      driverSdkBindingPackageBindingPackageName: foundation.providerAdapter.driverSdkBinding.packageBinding.packageName,
      driverSdkBindingPackageBindingPackageRef: foundation.providerAdapter.driverSdkBinding.packageBinding.packageRef,
      driverSdkBindingPackageBindingQueueClientConstructed: foundation.providerAdapter.driverSdkBinding.packageBinding.queueClientConstructed,
      driverSdkBindingPackageBindingQueueEventsConstructed: foundation.providerAdapter.driverSdkBinding.packageBinding.queueEventsConstructed,
      driverSdkBindingPackageBindingSdkClientConstructed: false,
      driverSdkBindingPackageBindingStatus: foundation.providerAdapter.driverSdkBinding.packageBinding.status,
      driverSdkBindingPackageBindingWorkerConstructed: foundation.providerAdapter.driverSdkBinding.packageBinding.workerConstructed,
      driverSdkBindingProductionReady: foundation.providerAdapter.driverSdkBinding.productionReady,
      driverSdkBindingProviderKind: foundation.providerAdapter.driverSdkBinding.providerKind,
      driverSdkBindingQueueRouteCount: foundation.providerAdapter.driverSdkBinding.queueRouteCount,
      driverSdkBindingRequiredConfigKeys: foundation.providerAdapter.driverSdkBinding.requiredConfigKeys,
      driverSdkBindingSdkClientConstructed: foundation.providerAdapter.driverSdkBinding.sdkClientConstructed,
      driverSdkBindingSdkPackageRef: foundation.providerAdapter.driverSdkBinding.sdkPackageRef,
      driverSdkBindingStatus: foundation.providerAdapter.driverSdkBinding.status,
      driverSdkBindingValid: foundation.providerAdapter.driverSdkBinding.valid,
      driverStatus: foundation.providerAdapter.driverStatus,
      driverValid: foundation.providerAdapter.driverValid,
      liveQueueConsumptionEnabled: foundation.providerAdapter.liveQueueConsumptionEnabled,
      liveQueuePublishingEnabled: foundation.providerAdapter.liveQueuePublishingEnabled,
      liveWorkerExecutionEnabled: foundation.providerAdapter.liveWorkerExecutionEnabled,
      mode: foundation.providerAdapter.mode,
      noLiveFlags: queueProviderAdapterNoLiveFlags,
      operationCount: foundation.providerAdapter.operationCount,
      productionReady: foundation.providerAdapter.productionReady,
      providerId: foundation.providerAdapter.providerId,
      requiredConfigKeys: foundation.providerAdapter.requiredConfigKeys,
      status: foundation.providerAdapter.status,
      valid: foundation.providerAdapter.valid,
    },
    queuePlanCoverage: {
      jobIds: uniqueStrings(foundation.queuePlans.map((queuePlan) => queuePlan.jobId)),
      queueCategories: uniqueStrings(foundation.queuePlans.map((queuePlan) => queuePlan.queueCategory)) as QueueCategory[],
      queueCategoryCount: foundation.readiness.queueCategoryCount,
      queueIds: foundation.readiness.queueIds,
      queuePlanCount: foundation.readiness.queuePlanCount,
      requiredConfigKeys: uniqueStrings(
        foundation.preconditions.flatMap((precondition) => precondition.requiredConfigKeys),
      ),
    },
    status: foundation.status,
    valid: foundation.valid,
  };
};

const createBackendSchedulerRuntimeReadinessSummary = ({
  env,
  profileId,
}: {
  env: Record<string, string | undefined>;
  profileId: BackendConfigContract["profileId"];
}): BackendSchedulerRuntimeReadinessSummary => {
  const foundation = createSchedulerRuntimeFoundation({
    env,
    profileId,
  });

  return {
    blockerCount: foundation.blockerCount,
    diagnosticCodes: foundation.diagnosticCodes,
    diagnostics: foundation.diagnostics,
    dryRunTrigger: {
      enabled: foundation.readiness.dryRunTriggerEnabled,
      liveCronExecutionEnabled: foundation.readiness.liveCronExecutionEnabled,
      liveQueuePublishingEnabled: foundation.readiness.liveQueuePublishingEnabled,
      liveSchedulerExecutionEnabled: foundation.readiness.liveSchedulerExecutionEnabled,
    },
    id: foundation.id,
    noLiveFlags: foundation.noLiveFlags,
    preconditions: foundation.preconditions,
    productionReady: foundation.productionReady,
    profileId: foundation.profileId,
    registrationCoverage: {
      jobFamilies: uniqueStrings(foundation.registrations.map((registration) => registration.jobFamily)),
      jobIds: uniqueStrings(foundation.registrations.map((registration) => registration.jobId)),
      registrationCount: foundation.readiness.registrationCount,
      requiredConfigKeys: foundation.readiness.requiredConfigKeys,
      scheduleIds: foundation.readiness.scheduleIds,
      triggerSourceCount: foundation.readiness.triggerSourceCount,
    },
    status: foundation.status,
    valid: foundation.valid,
  };
};

const createBackendWorkerSchedulerReadinessSummary = ({
  env,
  profileId,
  verificationSourceHandoff,
}: {
  env: Record<string, string | undefined>;
  profileId: BackendConfigContract["profileId"];
  verificationSourceHandoff: VerificationSourceHandoffSummary;
}): BackendWorkerSchedulerReadinessSummary => {
  const foundation = createWorkerSchedulerFoundation({
    env,
    profileId,
  });
  const workerRequiredPolicies = verificationSourceHandoff.entries.filter((entry) => entry.workerRequired);

  return {
    blockerCount: foundation.blockerCount,
    diagnosticCodes: foundation.diagnosticCodes,
    diagnostics: foundation.diagnostics,
    id: foundation.id,
    jobCatalogCoverage: {
      jobCatalogCount: foundation.readiness.jobCatalogCount,
      jobFamilyCount: foundation.readiness.jobFamilyCount,
      ownerServiceIds: uniqueStrings(foundation.jobCatalog.map((job) => job.ownerServiceId)),
      productionDependencyIds: uniqueStrings(
        foundation.jobCatalog.flatMap((job) => job.productionDependencyIds),
      ),
      requiredConfigKeys: uniqueStrings(
        foundation.jobCatalog.flatMap((job) => job.requiredConfigKeys),
      ),
      triggerSourceCount: foundation.readiness.triggerSourceCount,
    },
    noLiveFlags: foundation.noLiveFlags,
    preconditions: foundation.preconditions,
    productionReady: foundation.productionReady,
    profileId: foundation.profileId,
    providerHttpRuntime: foundation.providerHttpRuntime,
    schedulePolicyCoverage: {
      idempotencyPolicyCount: foundation.idempotencyPolicies.length,
      retryPolicyCount: foundation.retryBackoffPolicies.length,
      schedulePolicyCount: foundation.readiness.schedulePolicyCount,
    },
    status: foundation.status,
    valid: foundation.valid && verificationSourceHandoff.valid,
    verificationSourceHandoff: {
      id: verificationSourceHandoff.id,
      liveExecutionEnabled: verificationSourceHandoff.liveExecutionEnabled,
      supportedVerificationTypes: verificationSourceHandoff.supportedVerificationTypes,
      valid: verificationSourceHandoff.valid,
      workerRequiredPolicyCount: workerRequiredPolicies.length,
    },
  };
};

const createBackendWorkerLeaseStoreReadinessSummary = ({
  env,
  profileId,
}: {
  env: Record<string, string | undefined>;
  profileId: BackendConfigContract["profileId"];
}): BackendWorkerLeaseStoreReadinessSummary => {
  const foundation = createWorkerLeaseStoreFoundation({
    env,
    profileId,
  });

  return {
    adapterId: foundation.adapterId,
    blockerCount: foundation.blockerCount,
    diagnosticCodes: foundation.diagnosticCodes,
    diagnostics: foundation.diagnostics,
    disabledLiveOperationCount: foundation.readiness.disabledLiveOperationCount,
    heartbeatIntervalSeconds: foundation.readiness.heartbeatIntervalSeconds,
    id: foundation.id,
    liveQueuePublishingEnabled: foundation.readiness.liveQueuePublishingEnabled,
    liveWorkerExecutionEnabled: foundation.readiness.liveWorkerExecutionEnabled,
    mode: foundation.mode,
    noLiveFlags: foundation.noLiveFlags,
    operationCount: foundation.readiness.operationCount,
    preconditions: foundation.preconditions,
    productionReady: foundation.productionReady,
    profileId: foundation.profileId,
    requiredConfigKeys: foundation.readiness.requiredConfigKeys,
    status: foundation.status,
    storeId: foundation.storeId,
    ttlSeconds: foundation.readiness.ttlSeconds,
    valid: foundation.valid,
  };
};

const createBackendWorkerIdempotencyStoreReadinessSummary = ({
  env,
  profileId,
}: {
  env: Record<string, string | undefined>;
  profileId: BackendConfigContract["profileId"];
}): BackendWorkerIdempotencyStoreReadinessSummary => {
  const foundation = createWorkerIdempotencyStoreFoundation({
    env,
    profileId,
  });

  return {
    adapterId: foundation.adapterId,
    blockerCount: foundation.blockerCount,
    diagnosticCodes: foundation.diagnosticCodes,
    diagnostics: foundation.diagnostics,
    disabledLiveOperationCount: foundation.readiness.disabledLiveOperationCount,
    id: foundation.id,
    keySchemaVersion: foundation.keySchemaVersion,
    liveIdempotencyExecutionEnabled: foundation.readiness.liveIdempotencyExecutionEnabled,
    liveQueuePublishingEnabled: foundation.readiness.liveQueuePublishingEnabled,
    liveWorkerExecutionEnabled: foundation.readiness.liveWorkerExecutionEnabled,
    mode: foundation.mode,
    namespace: foundation.namespace,
    noLiveFlags: foundation.noLiveFlags,
    operationCount: foundation.readiness.operationCount,
    preconditions: foundation.preconditions,
    productionReady: foundation.productionReady,
    profileId: foundation.profileId,
    requiredConfigKeys: foundation.readiness.requiredConfigKeys,
    status: foundation.status,
    storeId: foundation.storeId,
    valid: foundation.valid,
  };
};

const createBackendObservabilityExporterReadinessSummary = ({
  env,
  profileId,
}: {
  env: Record<string, string | undefined>;
  profileId: BackendConfigContract["profileId"];
}): BackendObservabilityExporterReadinessSummary => {
  const foundation = createObservabilityExporterFoundation({
    env,
    profileId,
  });

  return {
    adapterId: foundation.adapterId,
    blockerCount: foundation.blockerCount,
    diagnosticCodes: foundation.diagnosticCodes,
    diagnostics: foundation.diagnostics,
    disabledLiveOperationCount: foundation.readiness.disabledLiveOperationCount,
    exporterId: foundation.exporterId,
    id: foundation.id,
    liveAlertRoutingEnabled: foundation.readiness.liveAlertRoutingEnabled,
    liveLogExportEnabled: foundation.readiness.liveLogExportEnabled,
    liveMetricsExportEnabled: foundation.readiness.liveMetricsExportEnabled,
    liveTelemetryExportEnabled: foundation.readiness.liveTelemetryExportEnabled,
    liveTraceExportEnabled: foundation.readiness.liveTraceExportEnabled,
    metricNamespace: foundation.metricNamespace,
    mode: foundation.mode,
    noLiveFlags: foundation.noLiveFlags,
    operationCount: foundation.readiness.operationCount,
    preconditions: foundation.preconditions,
    productionReady: foundation.productionReady,
    profileId: foundation.profileId,
    requiredConfigKeys: foundation.readiness.requiredConfigKeys,
    sinkId: foundation.sinkId,
    status: foundation.status,
    valid: foundation.valid,
  };
};

export const createBackendDatabaseAdapterRuntimeSummary = (
  runtime: BackendDatabaseAdapterRuntimeReadinessReport,
): BackendDatabaseAdapterRuntimeSummary => ({
  connectionPool: {
    configuredKeyCount: runtime.connectionPool.configuredKeyCount,
    diagnosticCodes: runtime.connectionPool.diagnosticCodes,
    liveConnectionAttempted: runtime.connectionPool.liveConnectionAttempted,
    missingKeys: runtime.connectionPool.missingKeys,
    redactedFields: runtime.connectionPool.redactedFields,
    requiredKeys: runtime.connectionPool.requiredKeys,
    safeLabel: runtime.connectionPool.safeLabel,
    state: runtime.connectionPool.state,
  },
  connectionPoolState: runtime.connectionPool.state,
  deferredDependencies: runtime.deferredDependencies,
  deferredDependencyIds: runtime.deferredDependencies.map((dependency) => dependency.id),
  diagnosticCodes: runtime.diagnostics.map((diagnostic) => diagnostic.code),
  diagnostics: runtime.diagnostics,
  driverId: runtime.driverId,
  liveConnectionAttempted: runtime.liveConnectionAttempted,
  liveQueryExecutionEnabled: runtime.liveQueryExecutionEnabled,
  migrationExecutor: {
    ...runtime.migrationExecutor,
    handoffDiagnosticCodes: runtime.migrationHandoff.diagnosticCodes,
    handoffDiagnostics: runtime.migrationHandoff.diagnostics,
    handoffId: runtime.migrationHandoff.id,
    handoffPreconditions: runtime.migrationHandoff.preconditions,
    handoffStatus: runtime.migrationHandoff.executorStatus,
    handoffValid: runtime.migrationHandoff.valid,
    migrationGateStatus: runtime.migrationHandoff.migrationGateStatus,
  },
  profileId: runtime.profileId,
  productionDbRuntime: {
    connectionState: runtime.productionDbRuntime.connectionState,
    diagnosticCodes: runtime.productionDbRuntime.diagnosticCodes,
    driverId: runtime.productionDbRuntime.driverId,
    driverProductionReady: runtime.productionDbRuntime.driverProductionReady,
    id: runtime.productionDbRuntime.id,
    liveConnectionAttempted: runtime.productionDbRuntime.liveConnectionAttempted,
    liveQueryExecutionEnabled: runtime.productionDbRuntime.liveQueryExecutionEnabled,
    migrationGateStatus: runtime.productionDbRuntime.migrationGateStatus,
    ownerStoreCount: runtime.productionDbRuntime.ownerStoreCount,
    profileId: runtime.productionDbRuntime.profileId,
    providerId: runtime.productionDbRuntime.providerId,
    schemaManifestId: runtime.productionDbRuntime.schemaManifestId,
    status: runtime.productionDbRuntime.status,
    valid: runtime.productionDbRuntime.valid,
  },
  providerId: runtime.providerId,
  queryAdapter: runtime.queryAdapter,
  requiredStoreCount: runtime.stores.filter((store) => store.required).length,
  status: runtime.status,
  stores: runtime.stores,
  transaction: runtime.transaction,
  valid: runtime.valid && runtime.migrationHandoff.valid,
});

export const createBackendServiceReadinessReport = ({
  campaignStore,
  configOptions,
  generatedAt = new Date(0).toISOString(),
  serverRuntimeOptions,
}: CreateBackendServiceReadinessReportOptions = {}): BackendServiceReadinessReport => {
  const config = resolveBackendConfigContract(configOptions);
  const env = configOptions?.env ?? (typeof process === "undefined" ? {} : process.env);
  const apiFoundation = createApiFoundationReport({ generatedAt });
  const servicePorts = createApiServicePortReport({ foundation: apiFoundation });
  const topology = createBackendTopologyReport({
    generatedAt,
    knownRouteIds: apiRuntimeRoutes.map((route) => route.id),
  });
  const persistenceAdapters = createPersistenceAdapterPortReport({
    activeDriverId: config.productionPersistence.requestedDriverId,
    persistenceMode: config.persistenceMode,
    profileId: config.profileId,
  });
  const migration = createMigrationManifest({
    env,
    liveMigrationApproved: config.productionPersistence.liveMigrationApproval,
    profileId: config.profileId,
  });
  const persistenceRuntime: BackendPersistenceRuntimeReadinessReport = {
    ...createProductionPersistenceRuntimeContract({
      ...configOptions,
      env,
      requestedDriverId: config.productionPersistence.requestedDriverId,
    }),
    migrationGate: migration.executionGate,
  };
  const databaseAdapterRuntimeContract = createProductionDatabaseAdapterRuntimeContract({
    ...configOptions,
    env,
  });
  const databaseAdapterRuntime: BackendDatabaseAdapterRuntimeReadinessReport = {
    ...databaseAdapterRuntimeContract,
    migrationHandoff: createDatabaseMigrationExecutorHandoff({
      adapterRuntime: databaseAdapterRuntimeContract,
      migrationGate: migration.executionGate,
      profileId: config.profileId,
    }),
  };
  const databaseReadiness = createDatabaseReadinessReport({
    migration,
    profileId: config.profileId,
  });
  const authSession = createAuthSessionReadinessReport({
    generatedAt,
    profileId: config.profileId,
    productionRequired: config.profileId === "production-required",
    sessionConfigReady: Boolean(env.CAMPAIGN_OS_AUTH_SECRET),
  });
  const authSessionFoundation = createProductionAuthSessionFoundation({
    generatedAt,
    observedInput: createAuthSessionObservedInput(env),
    profileId: config.profileId === "production-required" ? "production-required" : "local-review",
  });
  const authEnforcement = createBackendAuthEnforcementReadinessSummary(authSession);
  const campaignDbVerticalSlice = createCampaignDbVerticalSliceReadinessSummary({
    campaignStore,
    config,
    databaseAdapterRuntime,
    migration,
    persistenceRuntime,
  });
  const persistenceFoundation = createBackendPersistenceFoundationSummary({
    databaseAdapterRuntime,
    migration,
    persistenceRuntime,
  });
  const providerIndexerFoundation = createBackendProviderIndexerReadinessSummary({
    env,
    profileId: config.profileId,
  });
  const providerClientReadiness = createBackendProviderClientReadinessSummary({
    env,
    profileId: config.profileId,
  });
  const workerSchedulerFoundation = createBackendWorkerSchedulerReadinessSummary({
    env,
    profileId: config.profileId,
    verificationSourceHandoff: providerIndexerFoundation.verificationSourceHandoff,
  });
  const queueRuntimeFoundation = createBackendQueueRuntimeReadinessSummary({
    env,
    profileId: config.profileId,
  });
  const schedulerRuntimeFoundation = createBackendSchedulerRuntimeReadinessSummary({
    env,
    profileId: config.profileId,
  });
  const observabilityExporterFoundation = createBackendObservabilityExporterReadinessSummary({
    env,
    profileId: config.profileId,
  });
  const workerLeaseStoreFoundation = createBackendWorkerLeaseStoreReadinessSummary({
    env,
    profileId: config.profileId,
  });
  const workerIdempotencyStoreFoundation = createBackendWorkerIdempotencyStoreReadinessSummary({
    env,
    profileId: config.profileId,
  });
  const entrypoint: BackendServiceEntrypoint = {
    foundationValidationValid: apiFoundation.validation.valid,
    id: "campaign-os-backend-service",
    label: "Campaign OS Backend Service",
    profileId: config.profileId,
    routeCount: apiRuntimeRoutes.length,
    routeIds: apiRuntimeRoutes.map((route) => route.id),
    runtimeName: "campaign-os-api-runtime",
    supportMode: "local_seeded",
    version: config.version,
  };
  const validationIssues = createValidationIssues({
    apiFoundation,
    attachMap: backendAttachMap,
    authSession,
    campaignDbVerticalSlice,
    config,
    databaseAdapterRuntime,
    databaseReadiness,
    entrypoint,
    migration,
    observabilityExporterFoundation,
    persistenceAdapters,
    providerIndexerFoundation,
    providerClientReadiness,
    queueRuntimeFoundation,
    persistenceRuntime,
    schedulerRuntimeFoundation,
    servicePorts,
    topology,
    workerIdempotencyStoreFoundation,
    workerLeaseStoreFoundation,
    workerSchedulerFoundation,
  });
  const readinessWithoutBootstrap = {
    apiFoundation: {
      coverage: apiFoundation.coverage,
      servicePorts,
      validation: apiFoundation.validation,
    },
    attachMap: backendAttachMap,
    authEnforcement,
    authSession,
    authSessionFoundation,
    campaignDbVerticalSlice,
    config,
    databaseAdapterRuntime,
    databaseReadiness,
    entrypoint,
    migration,
    observabilityExporterFoundation,
    persistenceFoundation,
    providerIndexerFoundation,
    providerClientReadiness,
    queueRuntimeFoundation,
    workerIdempotencyStoreFoundation,
    workerLeaseStoreFoundation,
    persistenceRuntime,
    persistenceAdapters,
    profile: config.profile,
    schedulerRuntimeFoundation,
    topology: {
      coverage: topology.coverage,
      profileReadiness: topology.profileReadiness,
      validation: topology.validation,
    },
    validation: {
      issues: validationIssues,
      valid: validationIssues.length === 0,
    },
    workerSchedulerFoundation,
  };
  const backendRuntimeBootstrap = createBackendRuntimeBootstrapContract({
    backendReadiness: readinessWithoutBootstrap as BackendServiceReadinessReport,
    contract: resolveApiServerRuntimeContract({
      env,
      profileId: config.profileId,
      startedAt: generatedAt,
      version: config.version,
      ...serverRuntimeOptions,
    }),
    now: new Date(generatedAt),
  });

  return {
    ...readinessWithoutBootstrap,
    apiService: createApiServiceBootstrapSummary({
      authSession,
      backendRuntimeBootstrap,
      config,
      validationIssues,
    }),
    backendRuntimeBootstrap,
  };
};
