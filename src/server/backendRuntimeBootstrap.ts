import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createBackendRuntimeActivationContract,
  type BackendRuntimeActivationContract,
} from "./backendRuntimeActivation";
import type { BackendServiceReadinessReport } from "./backendService";
import type { ApiServerRuntimeContract } from "./serverRuntime";
import { contractWriterRequiredConfigKeys } from "../domain/contractWriterRuntime";

export type BackendRuntimeBootstrapStatus = "ready" | "blocked" | "deferred";
export type BackendRuntimeBootstrapDiagnosticSeverity = "error" | "warning" | "info";
export type BackendRuntimeBootstrapDiagnosticCode =
  | "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED"
  | "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID"
  | "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID"
  | "BACKEND_RUNTIME_BOOTSTRAP_SHUTDOWN_IN_PROGRESS"
  | "BACKEND_RUNTIME_BOOTSTRAP_STOPPED";

export type BackendRuntimeDeferredDependencyArea =
  | "deployment"
  | "database"
  | "auth"
  | "provider"
  | "worker"
  | "scheduler"
  | "contract"
  | "storage"
  | "observability"
  | "analytics"
  | "reward";

export type BackendRuntimeDeferredDependencyStatus = "deferred" | "blocked";
export type BackendRuntimeShutdownState = "running" | "stopping" | "stopped";

export interface BackendRuntimeBootstrapDiagnostic {
  code: BackendRuntimeBootstrapDiagnosticCode;
  field: string;
  message: string;
  severity: BackendRuntimeBootstrapDiagnosticSeverity;
}

export interface BackendRuntimeTracePolicy {
  failureEnvelopeTraceId: true;
  startupLogIncludesTracePolicy: true;
  successEnvelopeTraceId: true;
  traceHeaderName: "x-campaign-os-trace-id";
}

export interface BackendRuntimeStartupSummary {
  allowedOriginCount: number;
  attachPointCount: number;
  blockedAttachPointCount: number;
  corsEnabled: boolean;
  deferredAttachPointIds: string[];
  diagnosticCodes: string[];
  host: string;
  port: number;
  profileId: BackendRuntimeProfileId;
  runtimeVersion: string;
  startedAt: string;
  supportMode: string;
  valid: boolean;
}

export interface BackendRuntimeRequestGuardSummary {
  guardedFailureEnvelope: true;
  jsonContentTypes: string[];
  maxBodyBytes: number;
  traceHeaderName: "x-campaign-os-trace-id";
}

export interface BackendRuntimeShutdownSummary {
  activeRequestCount: number;
  closedAt?: string;
  shutdownTimeoutMs: number;
  state: BackendRuntimeShutdownState;
  stopStartedAt?: string;
}

export interface BackendRuntimeDeferredDependency {
  area: BackendRuntimeDeferredDependencyArea;
  blockedBy: string[];
  id: string;
  label: string;
  requiredBeforeProduction: true;
  status: BackendRuntimeDeferredDependencyStatus;
}

export interface BackendRuntimeReadinessProjection {
  authSession: {
    status: BackendServiceReadinessReport["authSession"]["status"];
    valid: boolean;
    verificationMode: BackendServiceReadinessReport["authSession"]["proofBoundary"]["verificationMode"];
  };
  backend: {
    diagnosticCodes: string[];
    entrypointId: string;
    supportMode: string;
    valid: boolean;
  };
  databaseAdapterRuntime: {
    diagnosticCodes: string[];
    liveConnectionAttempted: false;
    liveQueryExecutionEnabled: false;
    packageBindingBlockerCount: number;
    packageBindingDiagnosticCodes: string[];
    packageBindingId: string;
    packageBindingLiveConnectionAttempted: false;
    packageBindingLiveMigrationExecutionEnabled: false;
    packageBindingLiveProductionMutationEnabled: false;
    packageBindingLiveProviderCallsEnabled: false;
    packageBindingLiveQueryExecutionEnabled: false;
    packageBindingLiveTransactionExecutionEnabled: false;
    packageBindingNoLiveFlags: BackendServiceReadinessReport["databaseAdapterRuntime"]["packageBinding"]["noLiveFlags"];
    packageBindingProductionReady: false;
    packageBindingRequiredConfigKeys: string[];
    packageBindingStatus: BackendServiceReadinessReport["databaseAdapterRuntime"]["packageBinding"]["status"];
    packageBindingValid: boolean;
    status: BackendServiceReadinessReport["databaseAdapterRuntime"]["status"];
    valid: boolean;
  };
  persistenceRuntime: {
    diagnosticCodes: string[];
    liveConnectionAttempted: false;
    liveExecutionEnabled: false;
    status: BackendServiceReadinessReport["persistenceRuntime"]["status"];
    valid: boolean;
  };
  observabilityExporterFoundation: {
    adapterId: BackendServiceReadinessReport["observabilityExporterFoundation"]["adapterId"];
    blockerCount: number;
    diagnosticCodes: string[];
    disabledLiveOperationCount: number;
    exporterId: BackendServiceReadinessReport["observabilityExporterFoundation"]["exporterId"];
    id: BackendServiceReadinessReport["observabilityExporterFoundation"]["id"];
    liveAlertRoutingEnabled: false;
    liveLogExportEnabled: false;
    liveMetricsExportEnabled: false;
    liveTelemetryExportEnabled: false;
    liveTraceExportEnabled: false;
    metricNamespace: BackendServiceReadinessReport["observabilityExporterFoundation"]["metricNamespace"];
    mode: BackendServiceReadinessReport["observabilityExporterFoundation"]["mode"];
    operationCount: number;
    productionReady: false;
    requiredConfigKeys: string[];
    sinkId: BackendServiceReadinessReport["observabilityExporterFoundation"]["sinkId"];
    status: BackendServiceReadinessReport["observabilityExporterFoundation"]["status"];
    valid: boolean;
  };
  providerClientReadiness: {
    activationStatus: BackendServiceReadinessReport["providerClientReadiness"]["activationStatus"];
    blockerCount: number;
    diagnosticCodes: string[];
    downstreamLiveFlags: BackendServiceReadinessReport["providerClientReadiness"]["downstreamLiveFlags"];
    id: BackendServiceReadinessReport["providerClientReadiness"]["id"];
    liveProviderCallsAttempted: false;
    policy: BackendServiceReadinessReport["providerClientReadiness"]["policy"];
    productionReady: false;
    providerHttpRuntime: {
      activationStatus: BackendServiceReadinessReport["providerClientReadiness"]["providerHttpRuntime"]["activationStatus"];
      blockerCount: number;
      configuredCategories: BackendServiceReadinessReport["providerClientReadiness"]["providerHttpRuntime"]["configuredCategories"];
      diagnosticCodes: string[];
      downstreamLiveFlags: BackendServiceReadinessReport["providerClientReadiness"]["providerHttpRuntime"]["downstreamLiveFlags"];
      endpointCount: number;
      endpointRollout: BackendServiceReadinessReport["providerClientReadiness"]["providerHttpRuntime"]["endpointRollout"];
      liveHttpCallsAttempted: false;
      productionReady: false;
      runtimeId: BackendServiceReadinessReport["providerClientReadiness"]["providerHttpRuntime"]["id"];
      status: BackendServiceReadinessReport["providerClientReadiness"]["providerHttpRuntime"]["status"];
      transportProvided: boolean;
      valid: boolean;
    };
    providerClientsEnabled: boolean;
    providerClientsProvided: boolean;
    queueHandoff: BackendServiceReadinessReport["providerClientReadiness"]["queueHandoff"];
    redacted: true;
    registryClientCount: number;
    registryProviderGroups: string[];
    requiredConfigKeys: string[];
    status: BackendServiceReadinessReport["providerClientReadiness"]["status"];
    valid: boolean;
  };
  queueRuntimeFoundation: {
    blockerCount: number;
    diagnosticCodes: string[];
    dryRunEnqueueEnabled: boolean;
    id: BackendServiceReadinessReport["queueRuntimeFoundation"]["id"];
    liveCronExecutionEnabled: false;
    liveQueueConsumptionEnabled: false;
    liveQueueConsumingReadiness: {
      activationStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["consumingReadiness"]["activationStatus"];
      ackAttempted: boolean;
      blockerCount: number;
      consumeAttemptPolicy: BackendServiceReadinessReport["queueRuntimeFoundation"]["consumingReadiness"]["consumeAttemptPolicy"];
      consumeRequestEvaluated: boolean;
      consumeResultStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["consumingReadiness"]["consumeResultStatus"];
      consumerId: string;
      consumerProvided: boolean;
      deadLetterAttempted: boolean;
      diagnosticCodes: string[];
      handlerRegistryProvided: boolean;
      liveConsumeAttempted: boolean;
      liveQueueConsumptionEnabled: boolean;
      nackAttempted: boolean;
      noLiveSideEffects: BackendServiceReadinessReport["queueRuntimeFoundation"]["consumingReadiness"]["noLiveSideEffects"];
      productionReady: false;
      requiredConfigKeys: string[];
      retryScheduled: boolean;
      status: BackendServiceReadinessReport["queueRuntimeFoundation"]["consumingReadiness"]["status"];
    };
    liveQueuePublishingEnabled: false;
    liveQueuePublishingReadiness: {
      activationStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["publishingReadiness"]["activationStatus"];
      blockerCount: number;
      diagnosticCodes: string[];
      livePublishAttempted: boolean;
      liveQueuePublishingEnabled: boolean;
      noLiveSideEffects: BackendServiceReadinessReport["queueRuntimeFoundation"]["publishingReadiness"]["noLiveSideEffects"];
      productionReady: false;
      publishAttemptPolicy: BackendServiceReadinessReport["queueRuntimeFoundation"]["publishingReadiness"]["publishAttemptPolicy"];
      publishRequestEvaluated: boolean;
      publishResultStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["publishingReadiness"]["publishResultStatus"];
      publisherId: string;
      publisherProvided: boolean;
      requiredConfigKeys: string[];
      status: BackendServiceReadinessReport["queueRuntimeFoundation"]["publishingReadiness"]["status"];
    };
    liveSchedulerExecutionEnabled: false;
    liveWorkerExecutionEnabled: false;
    productionReady: false;
    providerAdapter: {
      adapterId: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["adapterId"];
      blockerCount: number;
      diagnosticCodes: string[];
      disabledLiveOperationCount: number;
      driverActivationGateSatisfied: boolean;
      driverBlockerCount: number;
      driverDiagnosticCodes: string[];
      driverDisabledLiveOperationCount: number;
      driverId: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverId"];
      driverLiveQueueConsumptionEnabled: false;
      driverLiveQueuePublishingEnabled: false;
      driverLiveWorkerExecutionEnabled: false;
      driverMode: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverMode"];
      driverOperationCount: number;
      driverProductionReady: false;
      driverProviderId: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverProviderId"];
      driverConsumeAckAttempted: boolean;
      driverConsumeAttemptPolicy: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverConsumeAttemptPolicy"];
      driverConsumeDeadLetterAttempted: boolean;
      driverConsumeDiagnosticCodes: string[];
      driverConsumeNackAttempted: boolean;
      driverConsumeRequestEvaluated: boolean;
      driverConsumeResultStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverConsumeResultStatus"];
      driverConsumeRetryScheduled: boolean;
      driverConsumingActivationStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverConsumingActivationStatus"];
      driverConsumingBlockerCount: number;
      driverConsumingConsumerId: string;
      driverConsumingConsumerProvided: boolean;
      driverConsumingHandlerRegistryProvided: boolean;
      driverConsumingLiveConsumeAttempted: boolean;
      driverConsumingLiveQueueConsumptionEnabled: boolean;
      driverConsumingNoLiveSideEffects: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverConsumingNoLiveSideEffects"];
      driverConsumingProductionReady: false;
      driverConsumingRequiredConfigKeys: string[];
      driverConsumingStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverConsumingStatus"];
      driverPublishAttemptPolicy: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverPublishAttemptPolicy"];
      driverPublishDiagnosticCodes: string[];
      driverPublishRequestEvaluated: boolean;
      driverPublishResultStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverPublishResultStatus"];
      driverPublishingActivationStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverPublishingActivationStatus"];
      driverPublishingBlockerCount: number;
      driverPublishingLivePublishAttempted: boolean;
      driverPublishingLiveQueuePublishingEnabled: boolean;
      driverPublishingNoLiveSideEffects: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverPublishingNoLiveSideEffects"];
      driverPublishingPublisherId: string;
      driverPublishingPublisherProvided: boolean;
      driverPublishingRequiredConfigKeys: string[];
      driverPublishingStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverPublishingStatus"];
      driverRequiredConfigKeys: string[];
      driverSdkBindingActivationGateSatisfied: boolean;
      driverSdkBindingBlockerCount: number;
      driverSdkBindingDiagnosticCodes: string[];
      driverSdkBindingDisabledLiveOperationCount: number;
      driverSdkBindingId: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingId"];
      driverSdkBindingLiveProviderCallAttempted: false;
      driverSdkBindingLiveQueuePublishingEnabled: false;
      driverSdkBindingLiveWorkerExecutionEnabled: false;
      driverSdkBindingMode: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingMode"];
      driverSdkBindingOperationCount: number;
      driverSdkBindingPackageBindingBrokerConnectionBlockerCount: number;
      driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: string[];
      driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode"];
      driverSdkBindingPackageBindingBrokerConnectionId: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingBrokerConnectionId"];
      driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: string[];
      driverSdkBindingPackageBindingBrokerConnectionStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingBrokerConnectionStatus"];
      driverSdkBindingPackageBindingBlockerCount: number;
      driverSdkBindingPackageBindingBrowserBundleAllowed: false;
      driverSdkBindingPackageBindingBullmqConstructionAttempted: boolean;
      driverSdkBindingPackageBindingBullmqConstructionBlockerCount: number;
      driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: string[];
      driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: boolean;
      driverSdkBindingPackageBindingBullmqConstructionId: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingBullmqConstructionId"];
      driverSdkBindingPackageBindingBullmqConstructionProductionReady: false;
      driverSdkBindingPackageBindingBullmqConstructionStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingBullmqConstructionStatus"];
      driverSdkBindingPackageBindingDiagnosticCodes: string[];
      driverSdkBindingPackageBindingFamily: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingFamily"];
      driverSdkBindingPackageBindingId: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingId"];
      driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false;
      driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false;
      driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false;
      driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false;
      driverSdkBindingPackageBindingPackageName: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingPackageName"];
      driverSdkBindingPackageBindingPackageRef: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingPackageRef"];
      driverSdkBindingPackageBindingQueueClientConstructed: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingQueueClientConstructed"];
      driverSdkBindingPackageBindingQueueEventsConstructed: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingQueueEventsConstructed"];
      driverSdkBindingPackageBindingSdkClientConstructed: false;
      driverSdkBindingPackageBindingStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingStatus"];
      driverSdkBindingPackageBindingWorkerConstructed: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingPackageBindingWorkerConstructed"];
      driverSdkBindingProductionReady: false;
      driverSdkBindingProviderKind: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingProviderKind"];
      driverSdkBindingQueueRouteCount: number;
      driverSdkBindingRequiredConfigKeys: string[];
      driverSdkBindingSdkClientConstructed: false;
      driverSdkBindingSdkPackageRef: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingSdkPackageRef"];
      driverSdkBindingStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverSdkBindingStatus"];
      driverSdkBindingValid: boolean;
      driverStatus: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["driverStatus"];
      driverValid: boolean;
      liveQueueConsumptionEnabled: false;
      liveQueuePublishingEnabled: false;
      liveWorkerExecutionEnabled: false;
      mode: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["mode"];
      operationCount: number;
      productionReady: false;
      providerId: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["providerId"];
      requiredConfigKeys: string[];
      status: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"]["status"];
      valid: boolean;
    };
    queuePlanCount: number;
    status: BackendServiceReadinessReport["queueRuntimeFoundation"]["status"];
    valid: boolean;
  };
  schedulerRuntimeFoundation: {
    blockerCount: number;
    diagnosticCodes: string[];
    dryRunTriggerEnabled: boolean;
    id: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["id"];
    liveCronExecutionEnabled: false;
    liveQueuePublishingEnabled: false;
    liveSchedulerExecutionEnabled: false;
    liveWorkerExecutionEnabled: false;
    productionReady: false;
    registrationCount: number;
    scheduleIds: string[];
    status: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["status"];
    valid: boolean;
  };
  workerLeaseStoreFoundation: {
    adapterId: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["adapterId"];
    blockerCount: number;
    diagnosticCodes: string[];
    disabledLiveOperationCount: number;
    id: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["id"];
    liveQueuePublishingEnabled: false;
    liveWorkerExecutionEnabled: false;
    mode: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["mode"];
    operationCount: number;
    productionReady: false;
    requiredConfigKeys: string[];
    status: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["status"];
    storeId: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["storeId"];
    valid: boolean;
  };
  workerIdempotencyStoreFoundation: {
    adapterId: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["adapterId"];
    blockerCount: number;
    diagnosticCodes: string[];
    disabledLiveOperationCount: number;
    id: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["id"];
    keySchemaVersion: string;
    liveIdempotencyExecutionEnabled: false;
    liveQueuePublishingEnabled: false;
    liveWorkerExecutionEnabled: false;
    mode: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["mode"];
    namespace: string;
    operationCount: number;
    productionReady: false;
    requiredConfigKeys: string[];
    status: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["status"];
    storeId: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["storeId"];
    valid: boolean;
  };
  workerSchedulerFoundation: {
    blockerCount: number;
    diagnosticCodes: string[];
    id: BackendServiceReadinessReport["workerSchedulerFoundation"]["id"];
    jobCatalogCount: number;
    liveCronExecutionEnabled: false;
    liveQueuePublishingEnabled: false;
    liveSchedulerExecutionEnabled: false;
    liveWorkerExecutionEnabled: false;
    productionReady: false;
    schedulePolicyCount: number;
    status: BackendServiceReadinessReport["workerSchedulerFoundation"]["status"];
    valid: boolean;
    verificationHandoffValid: boolean;
  };
}

export interface BackendRuntimeBootstrapContract {
  activation: BackendRuntimeActivationContract;
  deferredDependencies: BackendRuntimeDeferredDependency[];
  deferredDependencyIds: string[];
  diagnosticCodes: BackendRuntimeBootstrapDiagnosticCode[];
  diagnostics: BackendRuntimeBootstrapDiagnostic[];
  id: "campaign-os-backend-runtime-bootstrap";
  profileId: BackendRuntimeProfileId;
  readiness: BackendRuntimeReadinessProjection;
  requestGuard: BackendRuntimeRequestGuardSummary;
  runtimeVersion: string;
  shutdown: BackendRuntimeShutdownSummary;
  startup: BackendRuntimeStartupSummary;
  status: BackendRuntimeBootstrapStatus;
  supportMode: string;
  tracePolicy: BackendRuntimeTracePolicy;
  uptimeMs: number;
  valid: boolean;
}

export interface BackendRuntimeBootstrapShutdownState {
  activeRequestCount: number;
  closedAt?: string;
  state: BackendRuntimeShutdownState;
  stopStartedAt?: string;
}

export interface CreateBackendRuntimeBootstrapContractOptions {
  backendReadiness: BackendServiceReadinessReport;
  contract: ApiServerRuntimeContract;
  now?: Date;
  shutdownState?: BackendRuntimeBootstrapShutdownState;
}

export const backendRuntimeBootstrapDeferredDependencies: BackendRuntimeDeferredDependency[] = [
  {
    area: "deployment",
    blockedBy: ["container image", "reverse proxy", "runtime environment config"],
    id: "deployment-config",
    label: "Deployment configuration",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "database",
    blockedBy: ["driver package selection", "connection pool implementation"],
    id: "production-database-driver",
    label: "Production database driver",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "database",
    blockedBy: ["schema migration implementation", "migration approval gate"],
    id: "database-migration-executor",
    label: "Database migration executor",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "auth",
    blockedBy: ["wallet signature verifier", "session issuer", "RBAC enforcement"],
    id: "auth-middleware",
    label: "Auth middleware",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "provider",
    blockedBy: ["provider registry", "degradation policy", "service credentials"],
    id: "provider-adapters",
    label: "Provider adapters",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "worker",
    blockedBy: ["queue provider selection", "worker runtime mission", "worker idempotency store"],
    id: "worker-ingress",
    label: "Worker ingress",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "scheduler",
    blockedBy: ["scheduler runtime", "retry and backoff policy"],
    id: "scheduler",
    label: "Scheduler",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "contract",
    blockedBy: [...contractWriterRequiredConfigKeys],
    id: "contract-writer",
    label: "Contract writer",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "storage",
    blockedBy: ["object storage adapter", "signed URL safety review"],
    id: "object-storage-export",
    label: "Object storage export",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "observability",
    blockedBy: ["metrics exporter", "structured log sink", "trace collector"],
    id: "observability-exporter",
    label: "Observability exporter",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "analytics",
    blockedBy: ["analytics warehouse adapter", "event ingestion contract"],
    id: "analytics-warehouse",
    label: "Analytics warehouse",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    area: "reward",
    blockedBy: ["reward custody mission", "finance/security review"],
    id: "reward-custody",
    label: "Reward custody",
    requiredBeforeProduction: true,
    status: "blocked",
  },
  {
    area: "reward",
    blockedBy: ["reward distribution mission", ...contractWriterRequiredConfigKeys],
    id: "reward-distribution",
    label: "Reward distribution",
    requiredBeforeProduction: true,
    status: "blocked",
  },
];

const defaultShutdownState = (): BackendRuntimeBootstrapShutdownState => ({
  activeRequestCount: 0,
  state: "running",
});

const diagnostic = (
  code: BackendRuntimeBootstrapDiagnosticCode,
  field: string,
  message: string,
  severity: BackendRuntimeBootstrapDiagnosticSeverity = "error",
): BackendRuntimeBootstrapDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const createStartupSummary = (
  contract: ApiServerRuntimeContract,
): BackendRuntimeStartupSummary => ({
  allowedOriginCount: contract.corsPolicy.allowedOrigins.length,
  attachPointCount: contract.attachMap.length,
  blockedAttachPointCount: contract.attachMap.filter((attachPoint) => attachPoint.status === "blocked").length,
  corsEnabled: contract.corsPolicy.enabled,
  deferredAttachPointIds: contract.attachMap.map((attachPoint) => attachPoint.id),
  diagnosticCodes: contract.diagnostics.map((item) => item.code),
  host: contract.host,
  port: contract.port,
  profileId: contract.profileId,
  runtimeVersion: contract.runtimeVersion,
  startedAt: contract.startedAt,
  supportMode: contract.supportMode,
  valid: contract.valid,
});

const createReadinessProjection = (
  backendReadiness: BackendServiceReadinessReport,
): BackendRuntimeReadinessProjection => ({
  authSession: {
    status: backendReadiness.authSession.status,
    valid: backendReadiness.authSession.validation.valid,
    verificationMode: backendReadiness.authSession.proofBoundary.verificationMode,
  },
  backend: {
    diagnosticCodes: backendReadiness.validation.issues.map((issue) => issue.code),
    entrypointId: backendReadiness.entrypoint.id,
    supportMode: backendReadiness.entrypoint.supportMode,
    valid: backendReadiness.validation.valid,
  },
  databaseAdapterRuntime: {
    diagnosticCodes: backendReadiness.databaseAdapterRuntime.diagnostics.map((item) => item.code),
    liveConnectionAttempted: backendReadiness.databaseAdapterRuntime.liveConnectionAttempted,
    liveQueryExecutionEnabled: backendReadiness.databaseAdapterRuntime.liveQueryExecutionEnabled,
    packageBindingBlockerCount: backendReadiness.databaseAdapterRuntime.packageBinding.blockerCount,
    packageBindingDiagnosticCodes: backendReadiness.databaseAdapterRuntime.packageBinding.diagnosticCodes,
    packageBindingId: backendReadiness.databaseAdapterRuntime.packageBinding.bindingId,
    packageBindingLiveConnectionAttempted: backendReadiness.databaseAdapterRuntime.packageBinding.liveConnectionAttempted,
    packageBindingLiveMigrationExecutionEnabled:
      backendReadiness.databaseAdapterRuntime.packageBinding.liveMigrationExecutionEnabled,
    packageBindingLiveProductionMutationEnabled:
      backendReadiness.databaseAdapterRuntime.packageBinding.liveProductionMutationEnabled,
    packageBindingLiveProviderCallsEnabled: backendReadiness.databaseAdapterRuntime.packageBinding.liveProviderCallsEnabled,
    packageBindingLiveQueryExecutionEnabled: backendReadiness.databaseAdapterRuntime.packageBinding.liveQueryExecutionEnabled,
    packageBindingLiveTransactionExecutionEnabled:
      backendReadiness.databaseAdapterRuntime.packageBinding.liveTransactionExecutionEnabled,
    packageBindingNoLiveFlags: { ...backendReadiness.databaseAdapterRuntime.packageBinding.noLiveFlags },
    packageBindingProductionReady: backendReadiness.databaseAdapterRuntime.packageBinding.productionReady,
    packageBindingRequiredConfigKeys: [...backendReadiness.databaseAdapterRuntime.packageBinding.requiredConfigKeys],
    packageBindingStatus: backendReadiness.databaseAdapterRuntime.packageBinding.status,
    packageBindingValid: backendReadiness.databaseAdapterRuntime.packageBinding.valid,
    status: backendReadiness.databaseAdapterRuntime.status,
    valid: backendReadiness.databaseAdapterRuntime.valid
      && backendReadiness.databaseAdapterRuntime.migrationHandoff.valid,
  },
  persistenceRuntime: {
    diagnosticCodes: backendReadiness.persistenceRuntime.diagnostics.map((item) => item.code),
    liveConnectionAttempted: backendReadiness.persistenceRuntime.liveConnectionAttempted,
    liveExecutionEnabled: backendReadiness.persistenceRuntime.migrationGate.liveExecutionEnabled,
    status: backendReadiness.persistenceRuntime.status,
    valid: backendReadiness.persistenceRuntime.valid
      && backendReadiness.persistenceRuntime.migrationGate.status !== "blocked",
  },
  observabilityExporterFoundation: {
    adapterId: backendReadiness.observabilityExporterFoundation.adapterId,
    blockerCount: backendReadiness.observabilityExporterFoundation.blockerCount,
    diagnosticCodes: backendReadiness.observabilityExporterFoundation.diagnosticCodes,
    disabledLiveOperationCount: backendReadiness.observabilityExporterFoundation.disabledLiveOperationCount,
    exporterId: backendReadiness.observabilityExporterFoundation.exporterId,
    id: backendReadiness.observabilityExporterFoundation.id,
    liveAlertRoutingEnabled: backendReadiness.observabilityExporterFoundation.liveAlertRoutingEnabled,
    liveLogExportEnabled: backendReadiness.observabilityExporterFoundation.liveLogExportEnabled,
    liveMetricsExportEnabled: backendReadiness.observabilityExporterFoundation.liveMetricsExportEnabled,
    liveTelemetryExportEnabled: backendReadiness.observabilityExporterFoundation.liveTelemetryExportEnabled,
    liveTraceExportEnabled: backendReadiness.observabilityExporterFoundation.liveTraceExportEnabled,
    metricNamespace: backendReadiness.observabilityExporterFoundation.metricNamespace,
    mode: backendReadiness.observabilityExporterFoundation.mode,
    operationCount: backendReadiness.observabilityExporterFoundation.operationCount,
    productionReady: backendReadiness.observabilityExporterFoundation.productionReady,
    requiredConfigKeys: backendReadiness.observabilityExporterFoundation.requiredConfigKeys,
    sinkId: backendReadiness.observabilityExporterFoundation.sinkId,
    status: backendReadiness.observabilityExporterFoundation.status,
    valid: backendReadiness.observabilityExporterFoundation.valid,
  },
  providerClientReadiness: {
    activationStatus: backendReadiness.providerClientReadiness.activationStatus,
    blockerCount: backendReadiness.providerClientReadiness.blockerCount,
    diagnosticCodes: backendReadiness.providerClientReadiness.diagnosticCodes,
    downstreamLiveFlags: { ...backendReadiness.providerClientReadiness.downstreamLiveFlags },
    id: backendReadiness.providerClientReadiness.id,
    liveProviderCallsAttempted: backendReadiness.providerClientReadiness.liveProviderCallsAttempted,
    policy: { ...backendReadiness.providerClientReadiness.policy },
    productionReady: backendReadiness.providerClientReadiness.productionReady,
    providerHttpRuntime: {
      activationStatus: backendReadiness.providerClientReadiness.providerHttpRuntime.activationStatus,
      blockerCount: backendReadiness.providerClientReadiness.providerHttpRuntime.blockerCount,
      configuredCategories: [...backendReadiness.providerClientReadiness.providerHttpRuntime.configuredCategories],
      diagnosticCodes: backendReadiness.providerClientReadiness.providerHttpRuntime.diagnosticCodes,
      downstreamLiveFlags: { ...backendReadiness.providerClientReadiness.providerHttpRuntime.downstreamLiveFlags },
      endpointCount: backendReadiness.providerClientReadiness.providerHttpRuntime.endpointCount,
      endpointRollout: backendReadiness.providerClientReadiness.providerHttpRuntime.endpointRollout,
      liveHttpCallsAttempted: false,
      productionReady: backendReadiness.providerClientReadiness.providerHttpRuntime.productionReady,
      runtimeId: backendReadiness.providerClientReadiness.providerHttpRuntime.id,
      status: backendReadiness.providerClientReadiness.providerHttpRuntime.status,
      transportProvided: backendReadiness.providerClientReadiness.providerHttpRuntime.transportProvided,
      valid: backendReadiness.providerClientReadiness.providerHttpRuntime.valid,
    },
    providerClientsEnabled: backendReadiness.providerClientReadiness.providerClientsEnabled,
    providerClientsProvided: backendReadiness.providerClientReadiness.providerClientsProvided,
    queueHandoff: { ...backendReadiness.providerClientReadiness.queueHandoff },
    redacted: true,
    registryClientCount: backendReadiness.providerClientReadiness.registry.clients.length,
    registryProviderGroups: backendReadiness.providerClientReadiness.registry.providerGroups,
    requiredConfigKeys: backendReadiness.providerClientReadiness.requiredConfigKeys,
    status: backendReadiness.providerClientReadiness.status,
    valid: backendReadiness.providerClientReadiness.valid,
  },
  queueRuntimeFoundation: {
    blockerCount: backendReadiness.queueRuntimeFoundation.blockerCount,
    diagnosticCodes: backendReadiness.queueRuntimeFoundation.diagnosticCodes,
    dryRunEnqueueEnabled: backendReadiness.queueRuntimeFoundation.dryRunEnqueue.enabled,
    id: backendReadiness.queueRuntimeFoundation.id,
    liveCronExecutionEnabled: backendReadiness.queueRuntimeFoundation.noLiveFlags.liveCronExecutionEnabled,
    liveQueueConsumptionEnabled: false,
    liveQueueConsumingReadiness: {
      activationStatus: backendReadiness.queueRuntimeFoundation.consumingReadiness.activationStatus,
      ackAttempted: backendReadiness.queueRuntimeFoundation.consumingReadiness.ackAttempted,
      blockerCount: backendReadiness.queueRuntimeFoundation.consumingReadiness.blockerCount,
      consumeAttemptPolicy: backendReadiness.queueRuntimeFoundation.consumingReadiness.consumeAttemptPolicy,
      consumeRequestEvaluated: backendReadiness.queueRuntimeFoundation.consumingReadiness.consumeRequestEvaluated,
      consumeResultStatus: backendReadiness.queueRuntimeFoundation.consumingReadiness.consumeResultStatus,
      consumerId: backendReadiness.queueRuntimeFoundation.consumingReadiness.consumerId,
      consumerProvided: backendReadiness.queueRuntimeFoundation.consumingReadiness.consumerProvided,
      deadLetterAttempted: backendReadiness.queueRuntimeFoundation.consumingReadiness.deadLetterAttempted,
      diagnosticCodes: backendReadiness.queueRuntimeFoundation.consumingReadiness.diagnosticCodes,
      handlerRegistryProvided: backendReadiness.queueRuntimeFoundation.consumingReadiness.handlerRegistryProvided,
      liveConsumeAttempted: backendReadiness.queueRuntimeFoundation.consumingReadiness.liveConsumeAttempted,
      liveQueueConsumptionEnabled: backendReadiness.queueRuntimeFoundation.consumingReadiness.liveQueueConsumptionEnabled,
      nackAttempted: backendReadiness.queueRuntimeFoundation.consumingReadiness.nackAttempted,
      noLiveSideEffects: { ...backendReadiness.queueRuntimeFoundation.consumingReadiness.noLiveSideEffects },
      productionReady: false,
      requiredConfigKeys: backendReadiness.queueRuntimeFoundation.consumingReadiness.requiredConfigKeys,
      retryScheduled: backendReadiness.queueRuntimeFoundation.consumingReadiness.retryScheduled,
      status: backendReadiness.queueRuntimeFoundation.consumingReadiness.status,
    },
    liveQueuePublishingEnabled: backendReadiness.queueRuntimeFoundation.noLiveFlags.liveQueuePublishingEnabled,
    liveQueuePublishingReadiness: {
      activationStatus: backendReadiness.queueRuntimeFoundation.publishingReadiness.activationStatus,
      blockerCount: backendReadiness.queueRuntimeFoundation.publishingReadiness.blockerCount,
      diagnosticCodes: backendReadiness.queueRuntimeFoundation.publishingReadiness.diagnosticCodes,
      livePublishAttempted: backendReadiness.queueRuntimeFoundation.publishingReadiness.livePublishAttempted,
      liveQueuePublishingEnabled: backendReadiness.queueRuntimeFoundation.publishingReadiness.liveQueuePublishingEnabled,
      noLiveSideEffects: { ...backendReadiness.queueRuntimeFoundation.publishingReadiness.noLiveSideEffects },
      productionReady: false,
      publishAttemptPolicy: backendReadiness.queueRuntimeFoundation.publishingReadiness.publishAttemptPolicy,
      publishRequestEvaluated: backendReadiness.queueRuntimeFoundation.publishingReadiness.publishRequestEvaluated,
      publishResultStatus: backendReadiness.queueRuntimeFoundation.publishingReadiness.publishResultStatus,
      publisherId: backendReadiness.queueRuntimeFoundation.publishingReadiness.publisherId,
      publisherProvided: backendReadiness.queueRuntimeFoundation.publishingReadiness.publisherProvided,
      requiredConfigKeys: backendReadiness.queueRuntimeFoundation.publishingReadiness.requiredConfigKeys,
      status: backendReadiness.queueRuntimeFoundation.publishingReadiness.status,
    },
    liveSchedulerExecutionEnabled: backendReadiness.queueRuntimeFoundation.noLiveFlags.liveSchedulerExecutionEnabled,
    liveWorkerExecutionEnabled: backendReadiness.queueRuntimeFoundation.noLiveFlags.liveWorkerExecutionEnabled,
    productionReady: backendReadiness.queueRuntimeFoundation.productionReady,
    providerAdapter: {
      adapterId: backendReadiness.queueRuntimeFoundation.providerAdapter.adapterId,
      blockerCount: backendReadiness.queueRuntimeFoundation.providerAdapter.blockerCount,
      diagnosticCodes: backendReadiness.queueRuntimeFoundation.providerAdapter.diagnosticCodes,
      disabledLiveOperationCount: backendReadiness.queueRuntimeFoundation.providerAdapter.disabledLiveOperationCount,
      driverActivationGateSatisfied: backendReadiness.queueRuntimeFoundation.providerAdapter.driverActivationGateSatisfied,
      driverBlockerCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverBlockerCount,
      driverDiagnosticCodes: backendReadiness.queueRuntimeFoundation.providerAdapter.driverDiagnosticCodes,
      driverDisabledLiveOperationCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverDisabledLiveOperationCount,
      driverId: backendReadiness.queueRuntimeFoundation.providerAdapter.driverId,
      driverLiveQueueConsumptionEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.driverLiveQueueConsumptionEnabled,
      driverLiveQueuePublishingEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.driverLiveQueuePublishingEnabled,
      driverLiveWorkerExecutionEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.driverLiveWorkerExecutionEnabled,
      driverMode: backendReadiness.queueRuntimeFoundation.providerAdapter.driverMode,
      driverOperationCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverOperationCount,
      driverProductionReady: backendReadiness.queueRuntimeFoundation.providerAdapter.driverProductionReady,
      driverProviderId: backendReadiness.queueRuntimeFoundation.providerAdapter.driverProviderId,
      driverConsumeAckAttempted: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumeAckAttempted,
      driverConsumeAttemptPolicy: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumeAttemptPolicy,
      driverConsumeDeadLetterAttempted: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumeDeadLetterAttempted,
      driverConsumeDiagnosticCodes: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumeDiagnosticCodes,
      driverConsumeNackAttempted: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumeNackAttempted,
      driverConsumeRequestEvaluated: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumeRequestEvaluated,
      driverConsumeResultStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumeResultStatus,
      driverConsumeRetryScheduled: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumeRetryScheduled,
      driverConsumingActivationStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumingActivationStatus,
      driverConsumingBlockerCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumingBlockerCount,
      driverConsumingConsumerId: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumingConsumerId,
      driverConsumingConsumerProvided: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumingConsumerProvided,
      driverConsumingHandlerRegistryProvided: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumingHandlerRegistryProvided,
      driverConsumingLiveConsumeAttempted: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumingLiveConsumeAttempted,
      driverConsumingLiveQueueConsumptionEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumingLiveQueueConsumptionEnabled,
      driverConsumingNoLiveSideEffects: { ...backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumingNoLiveSideEffects },
      driverConsumingProductionReady: false,
      driverConsumingRequiredConfigKeys: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumingRequiredConfigKeys,
      driverConsumingStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverConsumingStatus,
      driverPublishAttemptPolicy: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishAttemptPolicy,
      driverPublishDiagnosticCodes: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishDiagnosticCodes,
      driverPublishRequestEvaluated: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishRequestEvaluated,
      driverPublishResultStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishResultStatus,
      driverPublishingActivationStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishingActivationStatus,
      driverPublishingBlockerCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishingBlockerCount,
      driverPublishingLivePublishAttempted: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishingLivePublishAttempted,
      driverPublishingLiveQueuePublishingEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishingLiveQueuePublishingEnabled,
      driverPublishingNoLiveSideEffects: { ...backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishingNoLiveSideEffects },
      driverPublishingPublisherId: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishingPublisherId,
      driverPublishingPublisherProvided: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishingPublisherProvided,
      driverPublishingRequiredConfigKeys: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishingRequiredConfigKeys,
      driverPublishingStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverPublishingStatus,
      driverRequiredConfigKeys: backendReadiness.queueRuntimeFoundation.providerAdapter.driverRequiredConfigKeys,
      driverSdkBindingActivationGateSatisfied: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingActivationGateSatisfied,
      driverSdkBindingBlockerCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingBlockerCount,
      driverSdkBindingDiagnosticCodes: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingDiagnosticCodes,
      driverSdkBindingDisabledLiveOperationCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingDisabledLiveOperationCount,
      driverSdkBindingId: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingId,
      driverSdkBindingLiveProviderCallAttempted: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingLiveProviderCallAttempted,
      driverSdkBindingLiveQueuePublishingEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingLiveQueuePublishingEnabled,
      driverSdkBindingLiveWorkerExecutionEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingLiveWorkerExecutionEnabled,
      driverSdkBindingMode: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingMode,
      driverSdkBindingOperationCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingOperationCount,
      driverSdkBindingPackageBindingBrokerConnectionBlockerCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBrokerConnectionBlockerCount,
      driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes,
      driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode,
      driverSdkBindingPackageBindingBrokerConnectionId: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBrokerConnectionId,
      driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys,
      driverSdkBindingPackageBindingBrokerConnectionStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBrokerConnectionStatus,
      driverSdkBindingPackageBindingBlockerCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBlockerCount,
      driverSdkBindingPackageBindingBrowserBundleAllowed: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBrowserBundleAllowed,
      driverSdkBindingPackageBindingBullmqConstructionAttempted: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBullmqConstructionAttempted,
      driverSdkBindingPackageBindingBullmqConstructionBlockerCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBullmqConstructionBlockerCount,
      driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes,
      driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked,
      driverSdkBindingPackageBindingBullmqConstructionId: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBullmqConstructionId,
      driverSdkBindingPackageBindingBullmqConstructionProductionReady: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBullmqConstructionProductionReady,
      driverSdkBindingPackageBindingBullmqConstructionStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingBullmqConstructionStatus,
      driverSdkBindingPackageBindingDiagnosticCodes: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingDiagnosticCodes,
      driverSdkBindingPackageBindingFamily: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingFamily,
      driverSdkBindingPackageBindingId: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingId,
      driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingLiveBrokerConnectionAttempted,
      driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted,
      driverSdkBindingPackageBindingLiveQueuePublishingEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingLiveQueuePublishingEnabled,
      driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingLiveWorkerExecutionEnabled,
      driverSdkBindingPackageBindingPackageName: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingPackageName,
      driverSdkBindingPackageBindingPackageRef: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingPackageRef,
      driverSdkBindingPackageBindingQueueClientConstructed: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingQueueClientConstructed,
      driverSdkBindingPackageBindingQueueEventsConstructed: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingQueueEventsConstructed,
      driverSdkBindingPackageBindingSdkClientConstructed: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingSdkClientConstructed,
      driverSdkBindingPackageBindingStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingStatus,
      driverSdkBindingPackageBindingWorkerConstructed: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingPackageBindingWorkerConstructed,
      driverSdkBindingProductionReady: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingProductionReady,
      driverSdkBindingProviderKind: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingProviderKind,
      driverSdkBindingQueueRouteCount: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingQueueRouteCount,
      driverSdkBindingRequiredConfigKeys: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingRequiredConfigKeys,
      driverSdkBindingSdkClientConstructed: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingSdkClientConstructed,
      driverSdkBindingSdkPackageRef: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingSdkPackageRef,
      driverSdkBindingStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingStatus,
      driverSdkBindingValid: backendReadiness.queueRuntimeFoundation.providerAdapter.driverSdkBindingValid,
      driverStatus: backendReadiness.queueRuntimeFoundation.providerAdapter.driverStatus,
      driverValid: backendReadiness.queueRuntimeFoundation.providerAdapter.driverValid,
      liveQueueConsumptionEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.liveQueueConsumptionEnabled,
      liveQueuePublishingEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.liveQueuePublishingEnabled,
      liveWorkerExecutionEnabled: backendReadiness.queueRuntimeFoundation.providerAdapter.liveWorkerExecutionEnabled,
      mode: backendReadiness.queueRuntimeFoundation.providerAdapter.mode,
      operationCount: backendReadiness.queueRuntimeFoundation.providerAdapter.operationCount,
      productionReady: backendReadiness.queueRuntimeFoundation.providerAdapter.productionReady,
      providerId: backendReadiness.queueRuntimeFoundation.providerAdapter.providerId,
      requiredConfigKeys: backendReadiness.queueRuntimeFoundation.providerAdapter.requiredConfigKeys,
      status: backendReadiness.queueRuntimeFoundation.providerAdapter.status,
      valid: backendReadiness.queueRuntimeFoundation.providerAdapter.valid,
    },
    queuePlanCount: backendReadiness.queueRuntimeFoundation.queuePlanCoverage.queuePlanCount,
    status: backendReadiness.queueRuntimeFoundation.status,
    valid: backendReadiness.queueRuntimeFoundation.valid,
  },
  schedulerRuntimeFoundation: {
    blockerCount: backendReadiness.schedulerRuntimeFoundation.blockerCount,
    diagnosticCodes: backendReadiness.schedulerRuntimeFoundation.diagnosticCodes,
    dryRunTriggerEnabled: backendReadiness.schedulerRuntimeFoundation.dryRunTrigger.enabled,
    id: backendReadiness.schedulerRuntimeFoundation.id,
    liveCronExecutionEnabled: backendReadiness.schedulerRuntimeFoundation.noLiveFlags.liveCronExecutionEnabled,
    liveQueuePublishingEnabled: backendReadiness.schedulerRuntimeFoundation.noLiveFlags.liveQueuePublishingEnabled,
    liveSchedulerExecutionEnabled: backendReadiness.schedulerRuntimeFoundation.noLiveFlags.liveSchedulerExecutionEnabled,
    liveWorkerExecutionEnabled: backendReadiness.schedulerRuntimeFoundation.noLiveFlags.liveWorkerExecutionEnabled,
    productionReady: backendReadiness.schedulerRuntimeFoundation.productionReady,
    registrationCount: backendReadiness.schedulerRuntimeFoundation.registrationCoverage.registrationCount,
    scheduleIds: backendReadiness.schedulerRuntimeFoundation.registrationCoverage.scheduleIds,
    status: backendReadiness.schedulerRuntimeFoundation.status,
    valid: backendReadiness.schedulerRuntimeFoundation.valid,
  },
  workerLeaseStoreFoundation: {
    adapterId: backendReadiness.workerLeaseStoreFoundation.adapterId,
    blockerCount: backendReadiness.workerLeaseStoreFoundation.blockerCount,
    diagnosticCodes: backendReadiness.workerLeaseStoreFoundation.diagnosticCodes,
    disabledLiveOperationCount: backendReadiness.workerLeaseStoreFoundation.disabledLiveOperationCount,
    id: backendReadiness.workerLeaseStoreFoundation.id,
    liveQueuePublishingEnabled: backendReadiness.workerLeaseStoreFoundation.liveQueuePublishingEnabled,
    liveWorkerExecutionEnabled: backendReadiness.workerLeaseStoreFoundation.liveWorkerExecutionEnabled,
    mode: backendReadiness.workerLeaseStoreFoundation.mode,
    operationCount: backendReadiness.workerLeaseStoreFoundation.operationCount,
    productionReady: backendReadiness.workerLeaseStoreFoundation.productionReady,
    requiredConfigKeys: backendReadiness.workerLeaseStoreFoundation.requiredConfigKeys,
    status: backendReadiness.workerLeaseStoreFoundation.status,
    storeId: backendReadiness.workerLeaseStoreFoundation.storeId,
    valid: backendReadiness.workerLeaseStoreFoundation.valid,
  },
  workerIdempotencyStoreFoundation: {
    adapterId: backendReadiness.workerIdempotencyStoreFoundation.adapterId,
    blockerCount: backendReadiness.workerIdempotencyStoreFoundation.blockerCount,
    diagnosticCodes: backendReadiness.workerIdempotencyStoreFoundation.diagnosticCodes,
    disabledLiveOperationCount: backendReadiness.workerIdempotencyStoreFoundation.disabledLiveOperationCount,
    id: backendReadiness.workerIdempotencyStoreFoundation.id,
    keySchemaVersion: backendReadiness.workerIdempotencyStoreFoundation.keySchemaVersion,
    liveIdempotencyExecutionEnabled: backendReadiness.workerIdempotencyStoreFoundation.liveIdempotencyExecutionEnabled,
    liveQueuePublishingEnabled: backendReadiness.workerIdempotencyStoreFoundation.liveQueuePublishingEnabled,
    liveWorkerExecutionEnabled: backendReadiness.workerIdempotencyStoreFoundation.liveWorkerExecutionEnabled,
    mode: backendReadiness.workerIdempotencyStoreFoundation.mode,
    namespace: backendReadiness.workerIdempotencyStoreFoundation.namespace,
    operationCount: backendReadiness.workerIdempotencyStoreFoundation.operationCount,
    productionReady: backendReadiness.workerIdempotencyStoreFoundation.productionReady,
    requiredConfigKeys: backendReadiness.workerIdempotencyStoreFoundation.requiredConfigKeys,
    status: backendReadiness.workerIdempotencyStoreFoundation.status,
    storeId: backendReadiness.workerIdempotencyStoreFoundation.storeId,
    valid: backendReadiness.workerIdempotencyStoreFoundation.valid,
  },
  workerSchedulerFoundation: {
    blockerCount: backendReadiness.workerSchedulerFoundation.blockerCount,
    diagnosticCodes: backendReadiness.workerSchedulerFoundation.diagnosticCodes,
    id: backendReadiness.workerSchedulerFoundation.id,
    jobCatalogCount: backendReadiness.workerSchedulerFoundation.jobCatalogCoverage.jobCatalogCount,
    liveCronExecutionEnabled: backendReadiness.workerSchedulerFoundation.noLiveFlags.liveCronExecutionEnabled,
    liveQueuePublishingEnabled: backendReadiness.workerSchedulerFoundation.noLiveFlags.liveQueuePublishingEnabled,
    liveSchedulerExecutionEnabled: backendReadiness.workerSchedulerFoundation.noLiveFlags.liveSchedulerExecutionEnabled,
    liveWorkerExecutionEnabled: backendReadiness.workerSchedulerFoundation.noLiveFlags.liveWorkerExecutionEnabled,
    productionReady: backendReadiness.workerSchedulerFoundation.productionReady,
    schedulePolicyCount: backendReadiness.workerSchedulerFoundation.schedulePolicyCoverage.schedulePolicyCount,
    status: backendReadiness.workerSchedulerFoundation.status,
    valid: backendReadiness.workerSchedulerFoundation.valid,
    verificationHandoffValid: backendReadiness.workerSchedulerFoundation.verificationSourceHandoff.valid,
  },
});

const createDiagnostics = ({
  backendReadiness,
  contract,
  shutdownState,
}: {
  backendReadiness: BackendServiceReadinessReport;
  contract: ApiServerRuntimeContract;
  shutdownState: BackendRuntimeBootstrapShutdownState;
}): BackendRuntimeBootstrapDiagnostic[] => {
  const diagnostics: BackendRuntimeBootstrapDiagnostic[] = [];

  if (!contract.valid) {
    diagnostics.push(diagnostic(
      "BACKEND_RUNTIME_BOOTSTRAP_SERVER_RUNTIME_INVALID",
      "serverRuntime",
      "API server runtime contract is blocked.",
    ));
  }

  if (!backendReadiness.validation.valid) {
    diagnostics.push(diagnostic(
      "BACKEND_RUNTIME_BOOTSTRAP_BACKEND_READINESS_INVALID",
      "backendReadiness",
      "Backend service readiness validation is blocked.",
    ));
  }

  if (contract.profileId === "production-required") {
    diagnostics.push(diagnostic(
      "BACKEND_RUNTIME_BOOTSTRAP_PRODUCTION_BLOCKED",
      "profileId",
      "Production-required backend runtime bootstrap is blocked until production dependencies are implemented.",
    ));
  }

  if (shutdownState.state === "stopping") {
    diagnostics.push(diagnostic(
      "BACKEND_RUNTIME_BOOTSTRAP_SHUTDOWN_IN_PROGRESS",
      "shutdown",
      "Backend runtime bootstrap is shutting down.",
      "warning",
    ));
  }

  if (shutdownState.state === "stopped") {
    diagnostics.push(diagnostic(
      "BACKEND_RUNTIME_BOOTSTRAP_STOPPED",
      "shutdown",
      "Backend runtime bootstrap is stopped.",
    ));
  }

  return diagnostics;
};

const resolveStatus = ({
  diagnostics,
  shutdownState,
}: {
  diagnostics: readonly BackendRuntimeBootstrapDiagnostic[];
  shutdownState: BackendRuntimeBootstrapShutdownState;
}): BackendRuntimeBootstrapStatus => {
  if (shutdownState.state === "stopping") {
    return "deferred";
  }

  return diagnostics.some((item) => item.severity === "error") ? "blocked" : "ready";
};

export const createBackendRuntimeBootstrapContract = ({
  backendReadiness,
  contract,
  now = new Date(),
  shutdownState = defaultShutdownState(),
}: CreateBackendRuntimeBootstrapContractOptions): BackendRuntimeBootstrapContract => {
  const diagnostics = createDiagnostics({
    backendReadiness,
    contract,
    shutdownState,
  });
  const status = resolveStatus({ diagnostics, shutdownState });
  const uptimeMs = Math.max(0, now.getTime() - Date.parse(contract.startedAt));
  const valid = diagnostics.every((item) => item.severity !== "error");
  const activation = createBackendRuntimeActivationContract({ runtime: contract });

  return {
    activation,
    deferredDependencies: backendRuntimeBootstrapDeferredDependencies,
    deferredDependencyIds: backendRuntimeBootstrapDeferredDependencies.map((dependency) => dependency.id),
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: "campaign-os-backend-runtime-bootstrap",
    profileId: contract.profileId,
    readiness: createReadinessProjection(backendReadiness),
    requestGuard: {
      guardedFailureEnvelope: true,
      jsonContentTypes: contract.requestGuard.jsonContentTypes,
      maxBodyBytes: contract.requestGuard.maxBodyBytes,
      traceHeaderName: contract.requestGuard.traceHeaderName,
    },
    runtimeVersion: contract.runtimeVersion,
    shutdown: {
      ...shutdownState,
      shutdownTimeoutMs: contract.shutdown.shutdownTimeoutMs,
    },
    startup: createStartupSummary(contract),
    status,
    supportMode: contract.supportMode,
    tracePolicy: {
      failureEnvelopeTraceId: true,
      startupLogIncludesTracePolicy: true,
      successEnvelopeTraceId: true,
      traceHeaderName: contract.requestGuard.traceHeaderName,
    },
    uptimeMs,
    valid,
  };
};
