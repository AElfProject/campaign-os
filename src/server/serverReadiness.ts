import {
  createBackendDatabaseAdapterRuntimeSummary,
  createBackendPersistenceRuntimeSummary,
  type BackendDatabaseAdapterRuntimeSummary,
  type BackendApiServiceBootstrapSummary,
  type BackendAuthEnforcementReadinessSummary,
  type CampaignDbVerticalSliceReadinessSummary,
  type BackendObservabilityExporterReadinessSummary,
  type BackendPersistenceFoundationSummary,
  type BackendProviderIndexerReadinessSummary,
  type BackendPersistenceRuntimeSummary,
  type BackendServiceReadinessReport,
} from "./backendService";
import {
  createBackendRuntimeBootstrapContract,
  type BackendRuntimeBootstrapContract,
} from "./backendRuntimeBootstrap";
import type { BackendRuntimeActivationContract } from "./backendRuntimeActivation";
import type { ApiRuntimeEnvelope } from "./envelope";
import type {
  ApiServerRuntimeContract,
  ServerRuntimeAttachPoint,
} from "./serverRuntime";

export type ServerRuntimeState = "live" | "ready" | "blocked" | "shutting_down" | "stopped";
export type ServerShutdownStateId = "running" | "stopping" | "stopped";

export interface ServerShutdownState {
  activeRequestCount: number;
  closedAt?: string;
  state: ServerShutdownStateId;
  stopStartedAt?: string;
}

export type ServerRuntimeApiServiceReadiness = BackendApiServiceBootstrapSummary & {
  activation: BackendRuntimeActivationContract;
};

export interface ServerRuntimeQueueRuntimeReadiness {
  blockerCount: BackendServiceReadinessReport["queueRuntimeFoundation"]["blockerCount"];
  diagnosticCodes: BackendServiceReadinessReport["queueRuntimeFoundation"]["diagnosticCodes"];
  dryRunEnqueueEnabled: BackendServiceReadinessReport["queueRuntimeFoundation"]["dryRunEnqueue"]["enabled"];
  id: BackendServiceReadinessReport["queueRuntimeFoundation"]["id"];
  liveQueuePublishingEnabled: false;
  noLiveFlags: BackendServiceReadinessReport["queueRuntimeFoundation"]["noLiveFlags"];
  productionReady: false;
  profileId: BackendServiceReadinessReport["queueRuntimeFoundation"]["profileId"];
  providerAdapter: BackendServiceReadinessReport["queueRuntimeFoundation"]["providerAdapter"];
  queueIds: BackendServiceReadinessReport["queueRuntimeFoundation"]["queuePlanCoverage"]["queueIds"];
  queuePlanCount: BackendServiceReadinessReport["queueRuntimeFoundation"]["queuePlanCoverage"]["queuePlanCount"];
  status: BackendServiceReadinessReport["queueRuntimeFoundation"]["status"];
  valid: BackendServiceReadinessReport["queueRuntimeFoundation"]["valid"];
}

export interface ServerRuntimeSchedulerRuntimeReadiness {
  blockerCount: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["blockerCount"];
  diagnosticCodes: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["diagnosticCodes"];
  dryRunTriggerEnabled: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["dryRunTrigger"]["enabled"];
  id: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["id"];
  liveCronExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveSchedulerExecutionEnabled: false;
  noLiveFlags: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["noLiveFlags"];
  productionReady: false;
  profileId: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["profileId"];
  registrationCount: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["registrationCoverage"]["registrationCount"];
  scheduleIds: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["registrationCoverage"]["scheduleIds"];
  status: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["status"];
  valid: BackendServiceReadinessReport["schedulerRuntimeFoundation"]["valid"];
}

export interface ServerRuntimeWorkerLeaseStoreReadiness {
  adapterId: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["adapterId"];
  blockerCount: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["blockerCount"];
  diagnosticCodes: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["diagnosticCodes"];
  disabledLiveOperationCount: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["disabledLiveOperationCount"];
  id: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["id"];
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["mode"];
  operationCount: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["operationCount"];
  productionReady: false;
  requiredConfigKeys: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["requiredConfigKeys"];
  status: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["status"];
  storeId: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["storeId"];
  valid: BackendServiceReadinessReport["workerLeaseStoreFoundation"]["valid"];
}

export interface ServerRuntimeWorkerIdempotencyStoreReadiness {
  adapterId: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["adapterId"];
  blockerCount: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["blockerCount"];
  diagnosticCodes: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["diagnosticCodes"];
  disabledLiveOperationCount: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["disabledLiveOperationCount"];
  id: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["id"];
  keySchemaVersion: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["keySchemaVersion"];
  liveIdempotencyExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["mode"];
  namespace: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["namespace"];
  operationCount: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["operationCount"];
  productionReady: false;
  requiredConfigKeys: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["requiredConfigKeys"];
  status: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["status"];
  storeId: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["storeId"];
  valid: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"]["valid"];
}

export interface ServerRuntimeObservabilityExporterReadiness {
  adapterId: BackendObservabilityExporterReadinessSummary["adapterId"];
  blockerCount: BackendObservabilityExporterReadinessSummary["blockerCount"];
  diagnosticCodes: BackendObservabilityExporterReadinessSummary["diagnosticCodes"];
  disabledLiveOperationCount: BackendObservabilityExporterReadinessSummary["disabledLiveOperationCount"];
  exporterId: BackendObservabilityExporterReadinessSummary["exporterId"];
  id: BackendObservabilityExporterReadinessSummary["id"];
  liveAlertRoutingEnabled: false;
  liveLogExportEnabled: false;
  liveMetricsExportEnabled: false;
  liveTelemetryExportEnabled: false;
  liveTraceExportEnabled: false;
  metricNamespace: BackendObservabilityExporterReadinessSummary["metricNamespace"];
  mode: BackendObservabilityExporterReadinessSummary["mode"];
  noLiveFlags: BackendObservabilityExporterReadinessSummary["noLiveFlags"];
  operationCount: BackendObservabilityExporterReadinessSummary["operationCount"];
  productionReady: false;
  profileId: BackendObservabilityExporterReadinessSummary["profileId"];
  requiredConfigKeys: BackendObservabilityExporterReadinessSummary["requiredConfigKeys"];
  sinkId: BackendObservabilityExporterReadinessSummary["sinkId"];
  status: BackendObservabilityExporterReadinessSummary["status"];
  valid: boolean;
}

export interface ServerRuntimeReadiness {
  corsPolicy: {
    allowedOriginCount: number;
    enabled: boolean;
    preflightHandledBeforeRuntime: true;
  };
  deferredAttachPoints: Array<{
    id: ServerRuntimeAttachPoint["id"];
    requiredBeforeProduction: boolean;
    status: ServerRuntimeAttachPoint["status"];
  }>;
  liveness: {
    live: boolean;
    startedAt: string;
    uptimeMs: number;
  };
  profileId: string;
  readiness: {
    authEnforcement: BackendAuthEnforcementReadinessSummary;
    apiService: ServerRuntimeApiServiceReadiness;
      authSession: {
        contracts: BackendServiceReadinessReport["authSession"]["authContracts"];
        foundation: BackendServiceReadinessReport["authSessionFoundation"];
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
    backendRuntimeBootstrap: BackendRuntimeBootstrapContract;
    campaignDbVerticalSlice: CampaignDbVerticalSliceReadinessSummary;
    database: {
      adapterStatus: string;
      migrationPlanStatus: string;
      valid: boolean;
    };
    databaseAdapterRuntime: BackendDatabaseAdapterRuntimeSummary;
    persistenceFoundation: BackendPersistenceFoundationSummary;
    observabilityExporterFoundation: ServerRuntimeObservabilityExporterReadiness;
    providerIndexerFoundation: BackendProviderIndexerReadinessSummary;
    queueRuntimeFoundation: ServerRuntimeQueueRuntimeReadiness;
    persistenceRuntime: BackendPersistenceRuntimeSummary;
    schedulerRuntimeFoundation: ServerRuntimeSchedulerRuntimeReadiness;
    workerIdempotencyStoreFoundation: ServerRuntimeWorkerIdempotencyStoreReadiness;
    workerLeaseStoreFoundation: ServerRuntimeWorkerLeaseStoreReadiness;
    workerSchedulerFoundation: BackendServiceReadinessReport["workerSchedulerFoundation"];
  };
  requestGuard: {
    guardedFailureEnvelope: true;
    maxBodyBytes: number;
    traceHeaderName: "x-campaign-os-trace-id";
  };
  shutdownState: ServerShutdownState & {
    shutdownTimeoutMs: number;
  };
  startedAt: string;
  status: ServerRuntimeState;
  supportMode: string;
  uptimeMs: number;
}

export interface CreateServerRuntimeReadinessOptions {
  backendReadiness: BackendServiceReadinessReport;
  contract: ApiServerRuntimeContract;
  now?: Date;
  shutdownState?: ServerShutdownState;
}

const defaultShutdownState = (): ServerShutdownState => ({
  activeRequestCount: 0,
  state: "running",
});

const createServerQueueRuntimeReadiness = (
  queueRuntimeFoundation: BackendServiceReadinessReport["queueRuntimeFoundation"],
): ServerRuntimeQueueRuntimeReadiness => ({
  blockerCount: queueRuntimeFoundation.blockerCount,
  diagnosticCodes: queueRuntimeFoundation.diagnosticCodes,
  dryRunEnqueueEnabled: queueRuntimeFoundation.dryRunEnqueue.enabled,
  id: queueRuntimeFoundation.id,
  liveQueuePublishingEnabled: queueRuntimeFoundation.dryRunEnqueue.liveQueuePublishingEnabled,
  noLiveFlags: queueRuntimeFoundation.noLiveFlags,
  productionReady: queueRuntimeFoundation.productionReady,
  profileId: queueRuntimeFoundation.profileId,
  providerAdapter: queueRuntimeFoundation.providerAdapter,
  queueIds: queueRuntimeFoundation.queuePlanCoverage.queueIds,
  queuePlanCount: queueRuntimeFoundation.queuePlanCoverage.queuePlanCount,
  status: queueRuntimeFoundation.status,
  valid: queueRuntimeFoundation.valid,
});

const createServerSchedulerRuntimeReadiness = (
  schedulerRuntimeFoundation: BackendServiceReadinessReport["schedulerRuntimeFoundation"],
): ServerRuntimeSchedulerRuntimeReadiness => ({
  blockerCount: schedulerRuntimeFoundation.blockerCount,
  diagnosticCodes: schedulerRuntimeFoundation.diagnosticCodes,
  dryRunTriggerEnabled: schedulerRuntimeFoundation.dryRunTrigger.enabled,
  id: schedulerRuntimeFoundation.id,
  liveCronExecutionEnabled: schedulerRuntimeFoundation.dryRunTrigger.liveCronExecutionEnabled,
  liveQueuePublishingEnabled: schedulerRuntimeFoundation.dryRunTrigger.liveQueuePublishingEnabled,
  liveSchedulerExecutionEnabled: schedulerRuntimeFoundation.dryRunTrigger.liveSchedulerExecutionEnabled,
  noLiveFlags: schedulerRuntimeFoundation.noLiveFlags,
  productionReady: schedulerRuntimeFoundation.productionReady,
  profileId: schedulerRuntimeFoundation.profileId,
  registrationCount: schedulerRuntimeFoundation.registrationCoverage.registrationCount,
  scheduleIds: schedulerRuntimeFoundation.registrationCoverage.scheduleIds,
  status: schedulerRuntimeFoundation.status,
  valid: schedulerRuntimeFoundation.valid,
});

const createServerWorkerLeaseStoreReadiness = (
  workerLeaseStoreFoundation: BackendServiceReadinessReport["workerLeaseStoreFoundation"],
): ServerRuntimeWorkerLeaseStoreReadiness => ({
  adapterId: workerLeaseStoreFoundation.adapterId,
  blockerCount: workerLeaseStoreFoundation.blockerCount,
  diagnosticCodes: workerLeaseStoreFoundation.diagnosticCodes,
  disabledLiveOperationCount: workerLeaseStoreFoundation.disabledLiveOperationCount,
  id: workerLeaseStoreFoundation.id,
  liveQueuePublishingEnabled: workerLeaseStoreFoundation.liveQueuePublishingEnabled,
  liveWorkerExecutionEnabled: workerLeaseStoreFoundation.liveWorkerExecutionEnabled,
  mode: workerLeaseStoreFoundation.mode,
  operationCount: workerLeaseStoreFoundation.operationCount,
  productionReady: workerLeaseStoreFoundation.productionReady,
  requiredConfigKeys: workerLeaseStoreFoundation.requiredConfigKeys,
  status: workerLeaseStoreFoundation.status,
  storeId: workerLeaseStoreFoundation.storeId,
  valid: workerLeaseStoreFoundation.valid,
});

const createServerWorkerIdempotencyStoreReadiness = (
  workerIdempotencyStoreFoundation: BackendServiceReadinessReport["workerIdempotencyStoreFoundation"],
): ServerRuntimeWorkerIdempotencyStoreReadiness => ({
  adapterId: workerIdempotencyStoreFoundation.adapterId,
  blockerCount: workerIdempotencyStoreFoundation.blockerCount,
  diagnosticCodes: workerIdempotencyStoreFoundation.diagnosticCodes,
  disabledLiveOperationCount: workerIdempotencyStoreFoundation.disabledLiveOperationCount,
  id: workerIdempotencyStoreFoundation.id,
  keySchemaVersion: workerIdempotencyStoreFoundation.keySchemaVersion,
  liveIdempotencyExecutionEnabled: workerIdempotencyStoreFoundation.liveIdempotencyExecutionEnabled,
  liveQueuePublishingEnabled: workerIdempotencyStoreFoundation.liveQueuePublishingEnabled,
  liveWorkerExecutionEnabled: workerIdempotencyStoreFoundation.liveWorkerExecutionEnabled,
  mode: workerIdempotencyStoreFoundation.mode,
  namespace: workerIdempotencyStoreFoundation.namespace,
  operationCount: workerIdempotencyStoreFoundation.operationCount,
  productionReady: workerIdempotencyStoreFoundation.productionReady,
  requiredConfigKeys: workerIdempotencyStoreFoundation.requiredConfigKeys,
  status: workerIdempotencyStoreFoundation.status,
  storeId: workerIdempotencyStoreFoundation.storeId,
  valid: workerIdempotencyStoreFoundation.valid,
});

const createServerObservabilityExporterReadiness = (
  observabilityExporterFoundation: BackendServiceReadinessReport["observabilityExporterFoundation"],
): ServerRuntimeObservabilityExporterReadiness => ({
  adapterId: observabilityExporterFoundation.adapterId,
  blockerCount: observabilityExporterFoundation.blockerCount,
  diagnosticCodes: observabilityExporterFoundation.diagnosticCodes,
  disabledLiveOperationCount: observabilityExporterFoundation.disabledLiveOperationCount,
  exporterId: observabilityExporterFoundation.exporterId,
  id: observabilityExporterFoundation.id,
  liveAlertRoutingEnabled: observabilityExporterFoundation.liveAlertRoutingEnabled,
  liveLogExportEnabled: observabilityExporterFoundation.liveLogExportEnabled,
  liveMetricsExportEnabled: observabilityExporterFoundation.liveMetricsExportEnabled,
  liveTelemetryExportEnabled: observabilityExporterFoundation.liveTelemetryExportEnabled,
  liveTraceExportEnabled: observabilityExporterFoundation.liveTraceExportEnabled,
  metricNamespace: observabilityExporterFoundation.metricNamespace,
  mode: observabilityExporterFoundation.mode,
  noLiveFlags: observabilityExporterFoundation.noLiveFlags,
  operationCount: observabilityExporterFoundation.operationCount,
  productionReady: observabilityExporterFoundation.productionReady,
  profileId: observabilityExporterFoundation.profileId,
  requiredConfigKeys: observabilityExporterFoundation.requiredConfigKeys,
  sinkId: observabilityExporterFoundation.sinkId,
  status: observabilityExporterFoundation.status,
  valid: observabilityExporterFoundation.valid,
});

const resolveStatus = ({
  backendReadiness,
  contract,
  shutdownState,
}: {
  backendReadiness: BackendServiceReadinessReport;
  contract: ApiServerRuntimeContract;
  shutdownState: ServerShutdownState;
}): ServerRuntimeState => {
  if (shutdownState.state === "stopped") {
    return "stopped";
  }

  if (shutdownState.state === "stopping") {
    return "shutting_down";
  }

  if (!contract.valid || !backendReadiness.validation.valid) {
    return "blocked";
  }

  return "ready";
};

export const createServerRuntimeReadiness = ({
  backendReadiness,
  contract,
  now = new Date(),
  shutdownState = defaultShutdownState(),
}: CreateServerRuntimeReadinessOptions): ServerRuntimeReadiness => {
  const uptimeMs = Math.max(0, now.getTime() - Date.parse(contract.startedAt));
  const backendRuntimeBootstrap = createBackendRuntimeBootstrapContract({
    backendReadiness,
    contract,
    now,
    shutdownState,
  });

  return {
    corsPolicy: {
      allowedOriginCount: contract.corsPolicy.allowedOrigins.length,
      enabled: contract.corsPolicy.enabled,
      preflightHandledBeforeRuntime: true,
    },
    deferredAttachPoints: contract.attachMap.map((attachPoint) => ({
      id: attachPoint.id,
      requiredBeforeProduction: attachPoint.requiredBeforeProduction,
      status: attachPoint.status,
    })),
    liveness: {
      live: shutdownState.state !== "stopped",
      startedAt: contract.startedAt,
      uptimeMs,
    },
    profileId: contract.profileId,
    readiness: {
      authEnforcement: backendReadiness.authEnforcement,
      apiService: {
        ...backendReadiness.apiService,
        activation: backendRuntimeBootstrap.activation,
      },
      authSession: {
        contracts: backendReadiness.authSession.authContracts,
        foundation: backendReadiness.authSessionFoundation,
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
      backendRuntimeBootstrap,
      campaignDbVerticalSlice: backendReadiness.campaignDbVerticalSlice,
      database: {
        adapterStatus: backendReadiness.databaseReadiness.adapter.status,
        migrationPlanStatus: backendReadiness.databaseReadiness.migrationPlan.status,
        valid: backendReadiness.databaseReadiness.validation.valid,
      },
      databaseAdapterRuntime: createBackendDatabaseAdapterRuntimeSummary(backendReadiness.databaseAdapterRuntime),
      persistenceFoundation: backendReadiness.persistenceFoundation,
      observabilityExporterFoundation: createServerObservabilityExporterReadiness(
        backendReadiness.observabilityExporterFoundation,
      ),
      providerIndexerFoundation: backendReadiness.providerIndexerFoundation,
      queueRuntimeFoundation: createServerQueueRuntimeReadiness(backendReadiness.queueRuntimeFoundation),
      persistenceRuntime: createBackendPersistenceRuntimeSummary(backendReadiness.persistenceRuntime),
      schedulerRuntimeFoundation: createServerSchedulerRuntimeReadiness(backendReadiness.schedulerRuntimeFoundation),
      workerIdempotencyStoreFoundation: createServerWorkerIdempotencyStoreReadiness(
        backendReadiness.workerIdempotencyStoreFoundation,
      ),
      workerLeaseStoreFoundation: createServerWorkerLeaseStoreReadiness(backendReadiness.workerLeaseStoreFoundation),
      workerSchedulerFoundation: backendReadiness.workerSchedulerFoundation,
    },
    requestGuard: {
      guardedFailureEnvelope: true,
      maxBodyBytes: contract.requestGuard.maxBodyBytes,
      traceHeaderName: contract.requestGuard.traceHeaderName,
    },
    shutdownState: {
      ...shutdownState,
      shutdownTimeoutMs: contract.shutdown.shutdownTimeoutMs,
    },
    startedAt: contract.startedAt,
    status: resolveStatus({ backendReadiness, contract, shutdownState }),
    supportMode: contract.supportMode,
    uptimeMs,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const mergeApiServiceMetadata = (
  current: unknown,
  next: ServerRuntimeReadiness["readiness"]["apiService"],
) => isRecord(current)
  ? {
    ...next,
    ...current,
  }
  : next;

export const withServerRuntimeReadiness = <TPayload>(
  envelope: ApiRuntimeEnvelope<TPayload>,
  serverRuntime: ServerRuntimeReadiness,
): ApiRuntimeEnvelope<unknown> => {
  if (!envelope.ok || !isRecord(envelope.data)) {
    return envelope;
  }

  return {
    ...envelope,
    data: {
      ...envelope.data,
      apiService: mergeApiServiceMetadata(envelope.data.apiService, serverRuntime.readiness.apiService),
      serverRuntime,
    },
  };
};
