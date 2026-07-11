import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { campaignDetail } from "../domain/fixtures";
import { contractWriterRequiredConfigKeys } from "../domain/contractWriterRuntime";
import { startCampaignOsApiServer, type CampaignOsApiServerHandle } from "./server";

type SmokePayload = {
  data?: unknown;
  ok?: boolean;
  traceId?: string;
};

export interface BackendRuntimeSmokeOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  host?: string;
  logger?: Pick<Console, "error" | "log"> | false;
  port?: number;
  shutdownTimeoutMs?: number;
}

export interface BackendRuntimeSmokeCheck {
  activationPresent: boolean;
  analyticsIngestionRuntime?: BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary;
  authSessionFoundation?: BackendRuntimeSmokeAuthSessionFoundationSummary;
  contractWriterRuntime?: BackendRuntimeSmokeContractWriterRuntimeSummary;
  deploymentHandoff?: unknown;
  endpoint: "/api/health" | "/api/contracts";
  ok: boolean;
  objectStorageExportRuntime?: BackendRuntimeSmokeObjectStorageExportRuntimeSummary;
  observabilityExporterFoundation?: BackendRuntimeSmokeObservabilityExporterFoundationSummary;
  persistenceFoundation?: BackendRuntimeSmokePersistenceFoundationSummary;
  productionBackendReadiness?: BackendRuntimeSmokeProductionBackendReadinessSummary;
  providerClientReadiness?: BackendRuntimeSmokeProviderClientReadinessSummary;
  providerIndexerFoundation?: BackendRuntimeSmokeProviderIndexerFoundationSummary;
  queueRuntimeFoundation?: BackendRuntimeSmokeQueueRuntimeFoundationSummary;
  schedulerRuntimeFoundation?: BackendRuntimeSmokeSchedulerRuntimeFoundationSummary;
  status: number;
  traceId: string;
  workerIdempotencyStoreFoundation?: BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary;
  workerLeaseStoreFoundation?: BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary;
  workerSchedulerFoundation?: BackendRuntimeSmokeWorkerSchedulerFoundationSummary;
}

export interface BackendRuntimeSmokeDurableLocalPersistenceSummary {
  adapterLabel?: string;
  countsByKind: Record<string, number>;
  durable: true;
  latestRecordKinds: string[];
  localOnly: true;
  mode: "local_json";
  noMigrationRunner: true;
  noProductionDatabase: true;
  noSecretHandling: true;
  recordCount: number;
  restartedRecordCount: number;
  status: "passed";
  traceIds: {
    exportPreview: string;
    firstHealth: string;
    restartedHealth: string;
    verification: string;
    walletSession: string;
  };
  wroteRecordKinds: string[];
}

export interface BackendRuntimeSmokePersistenceFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  liveConnectionAttempted: boolean;
  liveMigrationExecutionEnabled: boolean;
  liveQueryExecutionEnabled: boolean;
  migrationDryRunStatus?: string;
  productionReady: boolean;
  status?: string;
  storeCoverageCount: number;
  valid: boolean;
}

export interface BackendRuntimeSmokeAuthSessionFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  liveSideEffectsEnabled: boolean;
  liveSigningExecuted: boolean;
  liveVerificationExecuted: boolean;
  productionReady: boolean;
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeObjectStorageExportRuntimeSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  downloadEnabled: false;
  localReviewOnly: true;
  manifestOnly: true;
  objectKeyCreated: false;
  productionReady: false;
  providerCallAttempted: false;
  providerStatus?: string;
  requiredConfigKeys: string[];
  signedUrlCreated: false;
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary {
  diagnosticCodes: string[];
  eventCatalogCount: number;
  liveAnalyticsSdkExecuted: false;
  liveEventIngestionEnabled: false;
  liveEventWarehouseWrite: false;
  metricLineageCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status?: string;
  traceId?: string;
  valid: boolean;
  warehouseStatus?: string;
}

export interface BackendRuntimeSmokeContractWriterRuntimeSummary {
  configStatus?: string;
  diagnosticCodes: string[];
  liveContractWrite: false;
  liveQueuePublishing: false;
  liveRewardCustody: false;
  liveRewardDistribution: false;
  liveSignerExecution: false;
  liveWalletSignature: false;
  operationCount: number;
  operationGroupCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status?: string;
  traceId?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeProviderIndexerFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  liveAiCallsEnabled: false;
  liveAnalyticsIngestionEnabled: false;
  liveContractCallsEnabled: false;
  liveIndexerCallsEnabled: false;
  liveObjectStorageEnabled: false;
  liveProviderCallsEnabled: false;
  liveSocialCallsEnabled: false;
  productionReady: false;
  providerGroupCount: number;
  status?: string;
  valid: boolean;
  verificationSourceCoverageCount: number;
  workerExecutionEnabled: false;
}

export interface BackendRuntimeSmokeProviderClientReadinessSummary {
  activationStatus?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  liveProviderCallsAttempted: false;
  productionReady: false;
  providerHttpRuntime: BackendRuntimeSmokeProviderHttpRuntimeSummary;
  providerClientsEnabled: boolean;
  providerClientsProvided: boolean;
  queueHandoffStatus?: string;
  registryClientCount: number;
  registryProviderGroupCount: number;
  requiredConfigKeys: string[];
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeProviderHttpRuntimeSummary {
  activationStatus?: string;
  blockerCount: number;
  configuredCategories: string[];
  diagnosticCodes: string[];
  endpointCount: number;
  endpointRollout: {
    blockedCount: number;
    configuredCategories: string[];
    deferredCount: number;
    diagnosticCodes: string[];
    disabledCount: number;
    enabledCount: number;
    endpointCount: number;
    providerFamilies: string[];
    requiredConfigKeys: string[];
    valid: boolean;
  };
  liveHttpCallsAttempted: false;
  productionReady: false;
  runtimeId?: string;
  status?: string;
  transportProvided: boolean;
  valid: boolean;
}

export interface BackendRuntimeSmokeWorkerSchedulerFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  jobCatalogCount: number;
  liveCronExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveSchedulerExecutionEnabled: false;
  liveWorkerExecutionEnabled: false;
  productionReady: false;
  schedulePolicyCount: number;
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeQueueRuntimeFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  dryRunEnqueueEnabled: boolean;
  id?: string;
  liveCronExecutionEnabled: false;
  liveQueueConsumptionEnabled: false;
  liveQueueConsumingReadiness: BackendRuntimeSmokeQueueConsumingReadinessSummary;
  liveQueuePublishingEnabled: false;
  liveQueuePublishingReadiness: BackendRuntimeSmokeQueuePublishingReadinessSummary;
  liveSchedulerExecutionEnabled: false;
  liveWorkerExecutionEnabled: false;
  productionReady: false;
  providerAdapter: BackendRuntimeSmokeQueueProviderAdapterSummary;
  queuePlanCount: number;
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeQueuePublishingReadinessSummary {
  activationStatus?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  livePublishAttempted: boolean;
  liveQueuePublishingEnabled: boolean;
  noLiveSideEffects: Record<string, false>;
  productionReady: false;
  publishAttemptPolicy?: string;
  publishRequestEvaluated: boolean;
  publishResultStatus?: string;
  publisherId?: string;
  publisherProvided: boolean;
  requiredConfigKeys: string[];
  status?: string;
}

export interface BackendRuntimeSmokeQueueConsumingReadinessSummary {
  activationStatus?: string;
  ackAttempted: boolean;
  blockerCount: number;
  consumeAttemptPolicy?: string;
  consumeRequestEvaluated: boolean;
  consumeResultStatus?: string;
  consumerId?: string;
  consumerProvided: boolean;
  deadLetterAttempted: boolean;
  diagnosticCodes: string[];
  handlerRegistryProvided: boolean;
  liveConsumeAttempted: boolean;
  liveQueueConsumptionEnabled: boolean;
  nackAttempted: boolean;
  noLiveSideEffects: Record<string, false>;
  productionReady: false;
  requiredConfigKeys: string[];
  retryScheduled: boolean;
  status?: string;
}

export interface BackendRuntimeSmokeQueueProviderAdapterSummary {
  adapterId?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  disabledLiveOperationCount: number;
  driverActivationGateSatisfied: boolean;
  driverBlockerCount: number;
  driverDiagnosticCodes: string[];
  driverDisabledLiveOperationCount: number;
  driverId?: string;
  driverLiveQueueConsumptionEnabled: false;
  driverLiveQueuePublishingEnabled: false;
  driverLiveWorkerExecutionEnabled: false;
  driverMode?: string;
  driverOperationCount: number;
  driverProductionReady: false;
  driverProviderId?: string;
  driverConsumeAckAttempted: boolean;
  driverConsumeAttemptPolicy?: string;
  driverConsumeDeadLetterAttempted: boolean;
  driverConsumeDiagnosticCodes: string[];
  driverConsumeNackAttempted: boolean;
  driverConsumeRequestEvaluated: boolean;
  driverConsumeResultStatus?: string;
  driverConsumeRetryScheduled: boolean;
  driverConsumingActivationStatus?: string;
  driverConsumingBlockerCount: number;
  driverConsumingConsumerId?: string;
  driverConsumingConsumerProvided: boolean;
  driverConsumingHandlerRegistryProvided: boolean;
  driverConsumingLiveConsumeAttempted: boolean;
  driverConsumingLiveQueueConsumptionEnabled: boolean;
  driverConsumingNoLiveSideEffects: Record<string, false>;
  driverConsumingProductionReady: false;
  driverConsumingRequiredConfigKeys: string[];
  driverConsumingStatus?: string;
  driverPublishAttemptPolicy?: string;
  driverPublishDiagnosticCodes: string[];
  driverPublishRequestEvaluated: boolean;
  driverPublishResultStatus?: string;
  driverPublishingActivationStatus?: string;
  driverPublishingBlockerCount: number;
  driverPublishingLivePublishAttempted: boolean;
  driverPublishingLiveQueuePublishingEnabled: boolean;
  driverPublishingNoLiveSideEffects: Record<string, false>;
  driverPublishingPublisherId?: string;
  driverPublishingPublisherProvided: boolean;
  driverPublishingRequiredConfigKeys: string[];
  driverPublishingStatus?: string;
  driverRequiredConfigKeys: string[];
  driverSdkBindingActivationGateSatisfied: boolean;
  driverSdkBindingBlockerCount: number;
  driverSdkBindingDiagnosticCodes: string[];
  driverSdkBindingDisabledLiveOperationCount: number;
  driverSdkBindingId?: string;
  driverSdkBindingLiveProviderCallAttempted: false;
  driverSdkBindingLiveQueuePublishingEnabled: false;
  driverSdkBindingLiveWorkerExecutionEnabled: false;
  driverSdkBindingMode?: string;
  driverSdkBindingOperationCount: number;
  driverSdkBindingPackageBindingBrokerConnectionBlockerCount: number;
  driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: string[];
  driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode?: string;
  driverSdkBindingPackageBindingBrokerConnectionId?: string;
  driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: string[];
  driverSdkBindingPackageBindingBrokerConnectionStatus?: string;
  driverSdkBindingPackageBindingBlockerCount: number;
  driverSdkBindingPackageBindingBrowserBundleAllowed: false;
  driverSdkBindingPackageBindingBullmqConstructionAttempted: boolean;
  driverSdkBindingPackageBindingBullmqConstructionBlockerCount: number;
  driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: string[];
  driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: boolean;
  driverSdkBindingPackageBindingBullmqConstructionId?: string;
  driverSdkBindingPackageBindingBullmqConstructionProductionReady: false;
  driverSdkBindingPackageBindingBullmqConstructionStatus?: string;
  driverSdkBindingPackageBindingDiagnosticCodes: string[];
  driverSdkBindingPackageBindingFamily?: string;
  driverSdkBindingPackageBindingId?: string;
  driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false;
  driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false;
  driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false;
  driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false;
  driverSdkBindingPackageBindingPackageName?: string;
  driverSdkBindingPackageBindingPackageRef?: string;
  driverSdkBindingPackageBindingQueueClientConstructed: boolean;
  driverSdkBindingPackageBindingQueueEventsConstructed: boolean;
  driverSdkBindingPackageBindingSdkClientConstructed: false;
  driverSdkBindingPackageBindingStatus?: string;
  driverSdkBindingPackageBindingWorkerConstructed: boolean;
  driverSdkBindingProductionReady: false;
  driverSdkBindingProviderKind?: string;
  driverSdkBindingQueueRouteCount: number;
  driverSdkBindingRequiredConfigKeys: string[];
  driverSdkBindingSdkClientConstructed: false;
  driverSdkBindingSdkPackageRef?: string;
  driverSdkBindingStatus?: string;
  driverSdkBindingValid: boolean;
  driverStatus?: string;
  driverValid: boolean;
  liveQueueConsumptionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode?: string;
  operationCount: number;
  productionReady: false;
  providerId?: string;
  requiredConfigKeys: string[];
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeSchedulerRuntimeFoundationSummary {
  blockerCount: number;
  diagnosticCodes: string[];
  dryRunTriggerEnabled: boolean;
  id?: string;
  liveCronExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveSchedulerExecutionEnabled: false;
  liveWorkerExecutionEnabled: false;
  productionReady: false;
  registrationCount: number;
  scheduleIds: string[];
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary {
  adapterId?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  disabledLiveOperationCount: number;
  id?: string;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode?: string;
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status?: string;
  storeId?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary {
  adapterId?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  disabledLiveOperationCount: number;
  id?: string;
  keySchemaVersion?: string;
  liveIdempotencyExecutionEnabled: false;
  liveQueuePublishingEnabled: false;
  liveWorkerExecutionEnabled: false;
  mode?: string;
  namespace?: string;
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  status?: string;
  storeId?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeObservabilityExporterFoundationSummary {
  adapterId?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  disabledLiveOperationCount: number;
  exporterId?: string;
  id?: string;
  liveAlertRoutingEnabled: false;
  liveLogExportEnabled: false;
  liveMetricsExportEnabled: false;
  liveTelemetryExportEnabled: false;
  liveTraceExportEnabled: false;
  metricNamespace?: string;
  mode?: string;
  operationCount: number;
  productionReady: false;
  requiredConfigKeys: string[];
  sinkId?: string;
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeProductionBackendReadinessSummary {
  databasePackageBinding?: BackendRuntimeSmokeDatabasePackageBindingSummary;
  contractsEndpoint?: string;
  healthEndpoint?: string;
  missingApiSkillIds: string[];
  noLiveSideEffectsAllFalse: boolean;
  productionReady: false;
  profileId?: string;
  routeCount: number;
  smokeCommand?: string;
  startCommand?: string;
  status?: string;
  traceHeaderName?: string;
}

export interface BackendRuntimeSmokeDatabasePackageBindingSummary {
  bindingId?: string;
  blockerCount: number;
  diagnosticCodes: string[];
  liveConnectionAttempted: false;
  liveContractWritesEnabled: false;
  liveMigrationExecutionEnabled: false;
  liveProductionMutationEnabled: false;
  liveProviderCallsEnabled: false;
  liveQueryExecutionEnabled: false;
  liveRewardCustodyEnabled: false;
  liveRewardDistributionEnabled: false;
  liveStorageWritesEnabled: false;
  liveTransactionExecutionEnabled: false;
  noLiveFlagsAllFalse: boolean;
  packageName?: string;
  packageRef?: string;
  productionReady: false;
  requiredConfigKeys: string[];
  status?: string;
  valid: boolean;
}

export interface BackendRuntimeSmokeSummary {
  activationId?: string;
  authSessionFoundation: BackendRuntimeSmokeAuthSessionFoundationSummary;
  checks: {
    contracts: BackendRuntimeSmokeCheck;
    health: BackendRuntimeSmokeCheck;
  };
  host: string;
  durableLocalPersistence: BackendRuntimeSmokeDurableLocalPersistenceSummary;
  liveSideEffectsEnabled: boolean;
  analyticsIngestionRuntime: BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary;
  contractWriterRuntime: BackendRuntimeSmokeContractWriterRuntimeSummary;
  objectStorageExportRuntime: BackendRuntimeSmokeObjectStorageExportRuntimeSummary;
  observabilityExporterFoundation: BackendRuntimeSmokeObservabilityExporterFoundationSummary;
  persistenceFoundation: BackendRuntimeSmokePersistenceFoundationSummary;
  productionBackendReadiness: BackendRuntimeSmokeProductionBackendReadinessSummary;
  providerClientReadiness: BackendRuntimeSmokeProviderClientReadinessSummary;
  port: number;
  futureProduction: string[];
  futureProductionBlockerIds: string[];
  mvpReleaseBlockerIds: string[];
  mvpReleaseReady: boolean;
  productionReady: boolean;
  providerIndexerFoundation: BackendRuntimeSmokeProviderIndexerFoundationSummary;
  queueRuntimeFoundation: BackendRuntimeSmokeQueueRuntimeFoundationSummary;
  requiredBeforeMvpRelease: string[];
  requiredBeforeProduction: string[];
  schedulerRuntimeFoundation: BackendRuntimeSmokeSchedulerRuntimeFoundationSummary;
  shutdownState: "running" | "stopping" | "stopped";
  status: "passed";
  traceIds: {
    contracts: string;
    health: string;
  };
  url: string;
  workerIdempotencyStoreFoundation: BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary;
  workerLeaseStoreFoundation: BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary;
  workerSchedulerFoundation: BackendRuntimeSmokeWorkerSchedulerFoundationSummary;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJson = async (response: Response): Promise<SmokePayload> => {
  const parsed = await response.json();

  return isRecord(parsed) ? parsed : {};
};

const readNestedRecord = (
  value: unknown,
  path: string[],
): Record<string, unknown> | undefined => {
  let current: unknown = value;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return isRecord(current) ? current : undefined;
};

const readPersistenceFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "persistenceFoundation"]);

const readAuthSessionFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "authSessionFoundation"])
  ?? readNestedRecord(value, ["backendService", "authSession", "foundation"]);

const readProviderIndexerFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "providerIndexerFoundation"]);

const readProviderClientReadiness = (
  value: unknown,
): Record<string, unknown> | undefined => {
  const candidates = [
    readNestedRecord(value, ["backendService", "providerClientReadiness"]),
    readNestedRecord(value, ["backendService", "backendRuntimeBootstrap", "readiness", "providerClientReadiness"]),
    readNestedRecord(value, ["serverRuntime", "readiness", "providerClientReadiness"]),
  ];

  return candidates.find(hasProviderHttpEndpointRollout) ?? candidates.find((candidate) => candidate);
};

const hasProviderHttpEndpointRollout = (record: Record<string, unknown> | undefined): boolean =>
  readNestedRecord(record, ["providerHttpRuntime", "endpointRollout"]) !== undefined;

const readWorkerSchedulerFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "workerSchedulerFoundation"]);

const readQueueRuntimeFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "queueRuntimeFoundation"]);

const readSchedulerRuntimeFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "schedulerRuntimeFoundation"]);

const readWorkerLeaseStoreFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "workerLeaseStoreFoundation"]);

const readWorkerIdempotencyStoreFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "workerIdempotencyStoreFoundation"]);

const readObservabilityExporterFoundation = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["serverRuntime", "readiness", "observabilityExporterFoundation"]);

const readObjectStorageExportRuntime = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "objectStorageExportRuntime"])
  ?? readNestedRecord(value, ["serverRuntime", "readiness", "objectStorageExportRuntime"]);

const readAnalyticsIngestionRuntime = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "analyticsIngestionRuntime"])
  ?? readNestedRecord(value, ["serverRuntime", "readiness", "analyticsIngestionRuntime"]);

const readContractWriterRuntime = (
  value: unknown,
): Record<string, unknown> | undefined =>
  readNestedRecord(value, ["backendService", "contractWriterRuntime"])
  ?? readNestedRecord(value, ["serverRuntime", "readiness", "contractWriterRuntime"]);

const readProductionBackendReadiness = (
  value: unknown,
): Record<string, unknown> | undefined => {
  const readiness = readNestedRecord(value, ["productionBackendReadiness"]);

  if (!readiness) {
    return undefined;
  }

  const databasePackageBinding =
    readNestedRecord(readiness, ["databasePackageBinding"])
    ?? readNestedRecord(value, ["backendService", "databaseAdapterRuntime", "packageBinding"])
    ?? readNestedRecord(value, ["serverRuntime", "readiness", "databaseAdapterRuntime", "packageBinding"]);

  return {
    ...readiness,
    ...(databasePackageBinding ? { databasePackageBinding } : {}),
  };
};

const getNumber = (
  record: Record<string, unknown> | undefined,
  key: string,
): number => typeof record?.[key] === "number" ? record[key] : 0;

const getString = (
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined => typeof record?.[key] === "string" ? record[key] : undefined;

const summarizeProductionBackendReadiness = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProductionBackendReadinessSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const deployHandoff = readNestedRecord(record, ["deployHandoff"]);
  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const profile = readNestedRecord(record, ["profile"]);
  const routeCoverage = readNestedRecord(record, ["routeCoverage"]);
  const tracePolicy = readNestedRecord(record, ["tracePolicy"]);
  const databasePackageBinding = summarizeDatabasePackageBinding(
    readNestedRecord(record, ["databasePackageBinding"]),
  );
  const noLiveSideEffectsAllFalse =
    noLiveSideEffects !== undefined
    && Object.values(noLiveSideEffects).length > 0
    && Object.values(noLiveSideEffects).every((value) => value === false);

  return {
    contractsEndpoint: getString(deployHandoff, "contractsEndpoint"),
    databasePackageBinding,
    healthEndpoint: getString(deployHandoff, "healthEndpoint"),
    missingApiSkillIds: getStringArray(routeCoverage, "missingApiSkillIds"),
    noLiveSideEffectsAllFalse,
    productionReady: false,
    profileId: getString(profile, "id"),
    routeCount: getNumber(routeCoverage, "routeCount"),
    smokeCommand: getString(deployHandoff, "smokeCommand"),
    startCommand: getString(deployHandoff, "startCommand"),
    status: getString(record, "status"),
    traceHeaderName: getString(tracePolicy, "traceHeaderName"),
  };
};

const summarizeDatabasePackageBinding = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeDatabasePackageBindingSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const noLiveFlagsAllFalse =
    noLiveFlags !== undefined
    && Object.values(noLiveFlags).length > 0
    && Object.values(noLiveFlags).every((value) => value === false);
  const liveConnectionAttempted =
    record.liveConnectionAttempted === false || (record.liveConnectionAttempted === undefined
      && noLiveFlags?.liveConnectionAttempted === false);
  const liveContractWritesEnabled =
    record.liveContractWritesEnabled === false || (record.liveContractWritesEnabled === undefined
      && noLiveFlags?.liveContractWritesEnabled === false);
  const liveMigrationExecutionEnabled =
    record.liveMigrationExecutionEnabled === false || (record.liveMigrationExecutionEnabled === undefined
      && noLiveFlags?.liveMigrationExecutionEnabled === false);
  const liveProductionMutationEnabled =
    record.liveProductionMutationEnabled === false || (record.liveProductionMutationEnabled === undefined
      && noLiveFlags?.liveProductionMutationEnabled === false);
  const liveProviderCallsEnabled =
    record.liveProviderCallsEnabled === false || (record.liveProviderCallsEnabled === undefined
      && noLiveFlags?.liveProviderCallsEnabled === false);
  const liveQueryExecutionEnabled =
    record.liveQueryExecutionEnabled === false || (record.liveQueryExecutionEnabled === undefined
      && noLiveFlags?.liveQueryExecutionEnabled === false);
  const liveRewardCustodyEnabled =
    record.liveRewardCustodyEnabled === false || (record.liveRewardCustodyEnabled === undefined
      && noLiveFlags?.liveRewardCustodyEnabled === false);
  const liveRewardDistributionEnabled =
    record.liveRewardDistributionEnabled === false || (record.liveRewardDistributionEnabled === undefined
      && noLiveFlags?.liveRewardDistributionEnabled === false);
  const liveStorageWritesEnabled =
    record.liveStorageWritesEnabled === false || (record.liveStorageWritesEnabled === undefined
      && noLiveFlags?.liveStorageWritesEnabled === false);
  const liveTransactionExecutionEnabled =
    record.liveTransactionExecutionEnabled === false || (record.liveTransactionExecutionEnabled === undefined
      && noLiveFlags?.liveTransactionExecutionEnabled === false);

  if (
    !liveConnectionAttempted
    || !liveContractWritesEnabled
    || !liveMigrationExecutionEnabled
    || !liveProductionMutationEnabled
    || !liveProviderCallsEnabled
    || !liveQueryExecutionEnabled
    || !liveRewardCustodyEnabled
    || !liveRewardDistributionEnabled
    || !liveStorageWritesEnabled
    || !liveTransactionExecutionEnabled
  ) {
    return undefined;
  }

  return {
    bindingId: getString(record, "bindingId"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveConnectionAttempted: false,
    liveContractWritesEnabled: false,
    liveMigrationExecutionEnabled: false,
    liveProductionMutationEnabled: false,
    liveProviderCallsEnabled: false,
    liveQueryExecutionEnabled: false,
    liveRewardCustodyEnabled: false,
    liveRewardDistributionEnabled: false,
    liveStorageWritesEnabled: false,
    liveTransactionExecutionEnabled: false,
    noLiveFlagsAllFalse,
    packageName: getString(record, "packageName"),
    packageRef: getString(record, "packageRef"),
    productionReady: false,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizePersistenceFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokePersistenceFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const migrationDryRun = readNestedRecord(record, ["migrationDryRun"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveConnectionAttempted")
    && isExplicitFalse(record, "liveMigrationExecutionEnabled")
    && isExplicitFalse(record, "liveQueryExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveConnectionAttempted: false,
    liveMigrationExecutionEnabled: false,
    liveQueryExecutionEnabled: false,
    migrationDryRunStatus: getString(migrationDryRun, "status"),
    productionReady: false,
    status: getString(record, "status"),
    storeCoverageCount: getNumber(record, "storeCoverageCount"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeAuthSessionFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeAuthSessionFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveSideEffectsEnabled")
    && isExplicitFalse(record, "liveSigningExecuted")
    && isExplicitFalse(record, "liveVerificationExecuted");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveSideEffectsEnabled: false,
    liveSigningExecuted: false,
    liveVerificationExecuted: false,
    productionReady: false,
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeObjectStorageExportRuntime = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeObjectStorageExportRuntimeSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const safety = readNestedRecord(record, ["safety"]);
  const explicitNoLive =
    safety !== undefined
    && isExplicitFalse(safety, "downloadEnabled")
    && isExplicitFalse(safety, "liveUploadEnabled")
    && isExplicitFalse(safety, "objectKeyCreated")
    && isExplicitFalse(safety, "providerCallAttempted")
    && isExplicitFalse(safety, "signedUrlCreated")
    && safety.localReviewOnly === true
    && safety.manifestOnly === true;

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    downloadEnabled: false,
    localReviewOnly: true,
    manifestOnly: true,
    objectKeyCreated: false,
    productionReady: false,
    providerCallAttempted: false,
    providerStatus: getString(record, "providerStatus"),
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    signedUrlCreated: false,
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeAnalyticsIngestionRuntime = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const summary = readNestedRecord(record, ["summary"]);
  const warehouseHandoff = readNestedRecord(record, ["warehouseHandoff"]);
  const explicitNoLive =
    noLiveSideEffects !== undefined
    && isExplicitFalse(noLiveSideEffects, "liveAnalyticsSdkExecuted")
    && isExplicitFalse(noLiveSideEffects, "liveEventIngestionEnabled")
    && isExplicitFalse(noLiveSideEffects, "liveEventWarehouseWrite")
    && isExplicitFalse(warehouseHandoff, "eventWarehouseWriteAttempted")
    && isExplicitFalse(warehouseHandoff, "liveWarehouseWriteEnabled")
    && isExplicitFalse(warehouseHandoff, "productionReady");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    eventCatalogCount: getNumber(summary, "eventGroupCount"),
    liveAnalyticsSdkExecuted: false,
    liveEventIngestionEnabled: false,
    liveEventWarehouseWrite: false,
    metricLineageCount: getNumber(summary, "metricLineageCount"),
    productionReady: false,
    requiredConfigKeys: getStringArray(warehouseHandoff, "requiredConfigKeys"),
    status: getString(record, "status"),
    traceId: getString(record, "traceId"),
    valid: getBoolean(record, "valid"),
    warehouseStatus: getString(warehouseHandoff, "status"),
  };
};

const summarizeContractWriterRuntime = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeContractWriterRuntimeSummary | undefined => {
  if (!record || !isExplicitFalse(record, "productionReady")) {
    return undefined;
  }

  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const summary = readNestedRecord(record, ["summary"]);
  const configHandoff = readNestedRecord(record, ["configHandoff"]);
  const explicitNoLive =
    noLiveSideEffects !== undefined
    && isExplicitFalse(noLiveSideEffects, "liveContractWrite")
    && isExplicitFalse(noLiveSideEffects, "liveQueuePublishing")
    && isExplicitFalse(noLiveSideEffects, "liveRewardCustody")
    && isExplicitFalse(noLiveSideEffects, "liveRewardDistribution")
    && isExplicitFalse(noLiveSideEffects, "liveSignerExecution")
    && isExplicitFalse(noLiveSideEffects, "liveWalletSignature")
    && isExplicitFalse(configHandoff, "productionReady");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    configStatus: getString(configHandoff, "status"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveContractWrite: false,
    liveQueuePublishing: false,
    liveRewardCustody: false,
    liveRewardDistribution: false,
    liveSignerExecution: false,
    liveWalletSignature: false,
    operationCount: getNumber(summary, "operationCount"),
    operationGroupCount: getNumber(summary, "contractGroupCount"),
    productionReady: false,
    requiredConfigKeys: getStringArray(configHandoff, "requiredConfigKeys"),
    status: getString(record, "status"),
    traceId: getString(record, "traceId"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeProviderIndexerFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProviderIndexerFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const coverage = readNestedRecord(record, ["verificationSourceCoverage"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(noLiveFlags, "liveAiCallsEnabled")
    && isExplicitFalse(noLiveFlags, "liveAnalyticsIngestionEnabled")
    && isExplicitFalse(noLiveFlags, "liveContractCallsEnabled")
    && isExplicitFalse(noLiveFlags, "liveIndexerCallsEnabled")
    && isExplicitFalse(noLiveFlags, "liveObjectStorageEnabled")
    && isExplicitFalse(noLiveFlags, "liveProviderCallsEnabled")
    && isExplicitFalse(noLiveFlags, "liveSocialCallsEnabled")
    && isExplicitFalse(noLiveFlags, "workerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveAiCallsEnabled: false,
    liveAnalyticsIngestionEnabled: false,
    liveContractCallsEnabled: false,
    liveIndexerCallsEnabled: false,
    liveObjectStorageEnabled: false,
    liveProviderCallsEnabled: false,
    liveSocialCallsEnabled: false,
    productionReady: false,
    providerGroupCount: getNumber(record, "providerGroupCount"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
    verificationSourceCoverageCount: getNumber(coverage, "summaryCount"),
    workerExecutionEnabled: false,
  };
};

const summarizeProviderClientReadiness = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProviderClientReadinessSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const downstreamLiveFlags = readNestedRecord(record, ["downstreamLiveFlags"]);
  const providerHttpRuntime = summarizeProviderHttpRuntime(
    readNestedRecord(record, ["providerHttpRuntime"]),
  );
  const queueHandoff = readNestedRecord(record, ["queueHandoff"]);
  const registry = readNestedRecord(record, ["registry"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "providerClientsEnabled")
    && isExplicitFalse(record, "providerClientsProvided")
    && isExplicitFalse(record, "liveProviderCallsAttempted")
    && downstreamLiveFlags !== undefined
    && Object.values(downstreamLiveFlags).every((value) => value === false);

  if (!explicitNoLive || !providerHttpRuntime) {
    return undefined;
  }

  const providerGroups = getStringArray(record, "registryProviderGroups")
    .concat(getStringArray(registry, "providerGroups"));

  return {
    activationStatus: getString(record, "activationStatus"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    liveProviderCallsAttempted: false,
    productionReady: false,
    providerHttpRuntime,
    providerClientsEnabled: false,
    providerClientsProvided: false,
    queueHandoffStatus: getString(queueHandoff, "consumeReadinessStatus"),
    registryClientCount: getNumber(record, "registryClientCount") || getNumber(registry, "clientCount"),
    registryProviderGroupCount: providerGroups.length,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeProviderHttpRuntime = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProviderHttpRuntimeSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const downstreamLiveFlags = readNestedRecord(record, ["downstreamLiveFlags"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveHttpCallsAttempted")
    && downstreamLiveFlags !== undefined
    && Object.values(downstreamLiveFlags).every((value) => value === false);

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    activationStatus: getString(record, "activationStatus"),
    blockerCount: getNumber(record, "blockerCount"),
    configuredCategories: getStringArray(record, "configuredCategories"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    endpointCount: getNumber(record, "endpointCount"),
    endpointRollout: summarizeEndpointRollout(readNestedRecord(record, ["endpointRollout"])),
    liveHttpCallsAttempted: false,
    productionReady: false,
    runtimeId: getString(record, "runtimeId") ?? getString(record, "id"),
    status: getString(record, "status"),
    transportProvided: getBoolean(record, "transportProvided"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeEndpointRollout = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeProviderHttpRuntimeSummary["endpointRollout"] => ({
  blockedCount: getNumber(record, "blockedCount"),
  configuredCategories: getStringArray(record, "configuredCategories"),
  deferredCount: getNumber(record, "deferredCount"),
  diagnosticCodes: getStringArray(record, "diagnosticCodes"),
  disabledCount: getNumber(record, "disabledCount"),
  enabledCount: getNumber(record, "enabledCount"),
  endpointCount: getNumber(record, "endpointCount"),
  providerFamilies: getStringArray(record, "providerFamilies"),
  requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
  valid: getBoolean(record, "valid"),
});

const summarizeWorkerSchedulerFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeWorkerSchedulerFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const jobCatalogCoverage = readNestedRecord(record, ["jobCatalogCoverage"]);
  const schedulePolicyCoverage = readNestedRecord(record, ["schedulePolicyCoverage"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(noLiveFlags, "liveCronExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveQueuePublishingEnabled")
    && isExplicitFalse(noLiveFlags, "liveSchedulerExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    jobCatalogCount: getNumber(jobCatalogCoverage, "jobCatalogCount"),
    liveCronExecutionEnabled: false,
    liveQueuePublishingEnabled: false,
    liveSchedulerExecutionEnabled: false,
    liveWorkerExecutionEnabled: false,
    productionReady: false,
    schedulePolicyCount: getNumber(schedulePolicyCoverage, "schedulePolicyCount"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeQueueRuntimeFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeQueueRuntimeFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const providerAdapter = summarizeQueueProviderAdapter(
    readNestedRecord(record, ["providerAdapter"]),
  );
  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const liveQueueConsumptionDisabled = record.liveQueueConsumptionEnabled === undefined
    ? providerAdapter?.liveQueueConsumptionEnabled === false
    : isExplicitFalse(record, "liveQueueConsumptionEnabled");
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && liveQueueConsumptionDisabled
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(noLiveFlags, "liveCronExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveQueuePublishingEnabled")
    && isExplicitFalse(noLiveFlags, "liveSchedulerExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  const liveQueuePublishingReadinessRecord = readNestedRecord(record, ["liveQueuePublishingReadiness"]);
  const liveQueuePublishingReadiness = liveQueuePublishingReadinessRecord
    ? summarizeQueuePublishingReadiness(liveQueuePublishingReadinessRecord)
    : summarizeQueuePublishingReadinessFromProviderAdapter(providerAdapter);
  const liveQueueConsumingReadinessRecord = readNestedRecord(record, ["liveQueueConsumingReadiness"]);
  const liveQueueConsumingReadiness = liveQueueConsumingReadinessRecord
    ? summarizeQueueConsumingReadiness(liveQueueConsumingReadinessRecord)
    : summarizeQueueConsumingReadinessFromProviderAdapter(providerAdapter);

  if (!providerAdapter || !liveQueuePublishingReadiness || !liveQueueConsumingReadiness) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    dryRunEnqueueEnabled: getBoolean(record, "dryRunEnqueueEnabled"),
    id: getString(record, "id"),
    liveCronExecutionEnabled: false,
    liveQueueConsumptionEnabled: false,
    liveQueueConsumingReadiness,
    liveQueuePublishingEnabled: false,
    liveQueuePublishingReadiness,
    liveSchedulerExecutionEnabled: false,
    liveWorkerExecutionEnabled: false,
    productionReady: false,
    providerAdapter,
    queuePlanCount: getNumber(record, "queuePlanCount"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeQueueConsumingReadiness = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeQueueConsumingReadinessSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "ackAttempted")
    && isExplicitFalse(record, "deadLetterAttempted")
    && isExplicitFalse(record, "liveConsumeAttempted")
    && isExplicitFalse(record, "liveQueueConsumptionEnabled")
    && isExplicitFalse(record, "nackAttempted")
    && isExplicitFalse(record, "retryScheduled")
    && noLiveSideEffects !== undefined
    && Object.values(noLiveSideEffects).every((value) => value === false);

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    activationStatus: getString(record, "activationStatus"),
    ackAttempted: false,
    blockerCount: getNumber(record, "blockerCount"),
    consumeAttemptPolicy: getString(record, "consumeAttemptPolicy"),
    consumeRequestEvaluated: getBoolean(record, "consumeRequestEvaluated"),
    consumeResultStatus: getString(record, "consumeResultStatus"),
    consumerId: getString(record, "consumerId"),
    consumerProvided: getBoolean(record, "consumerProvided"),
    deadLetterAttempted: false,
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    handlerRegistryProvided: getBoolean(record, "handlerRegistryProvided"),
    liveConsumeAttempted: false,
    liveQueueConsumptionEnabled: false,
    nackAttempted: false,
    noLiveSideEffects: noLiveSideEffects as Record<string, false>,
    productionReady: false,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    retryScheduled: false,
    status: getString(record, "status"),
  };
};

const summarizeQueueConsumingReadinessFromProviderAdapter = (
  providerAdapter: BackendRuntimeSmokeQueueProviderAdapterSummary | undefined,
): BackendRuntimeSmokeQueueConsumingReadinessSummary | undefined => {
  if (!providerAdapter) {
    return undefined;
  }

  return {
    activationStatus: providerAdapter.driverConsumingActivationStatus,
    ackAttempted: providerAdapter.driverConsumeAckAttempted,
    blockerCount: providerAdapter.driverConsumingBlockerCount,
    consumeAttemptPolicy: providerAdapter.driverConsumeAttemptPolicy,
    consumeRequestEvaluated: providerAdapter.driverConsumeRequestEvaluated,
    consumeResultStatus: providerAdapter.driverConsumeResultStatus,
    consumerId: providerAdapter.driverConsumingConsumerId,
    consumerProvided: providerAdapter.driverConsumingConsumerProvided,
    deadLetterAttempted: providerAdapter.driverConsumeDeadLetterAttempted,
    diagnosticCodes: providerAdapter.driverConsumeDiagnosticCodes,
    handlerRegistryProvided: providerAdapter.driverConsumingHandlerRegistryProvided,
    liveConsumeAttempted: providerAdapter.driverConsumingLiveConsumeAttempted,
    liveQueueConsumptionEnabled: providerAdapter.driverConsumingLiveQueueConsumptionEnabled,
    nackAttempted: providerAdapter.driverConsumeNackAttempted,
    noLiveSideEffects: providerAdapter.driverConsumingNoLiveSideEffects,
    productionReady: false,
    requiredConfigKeys: providerAdapter.driverConsumingRequiredConfigKeys,
    retryScheduled: providerAdapter.driverConsumeRetryScheduled,
    status: providerAdapter.driverConsumingStatus,
  };
};

const summarizeQueuePublishingReadiness = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeQueuePublishingReadinessSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveSideEffects = readNestedRecord(record, ["noLiveSideEffects"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "livePublishAttempted")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && noLiveSideEffects !== undefined
    && Object.values(noLiveSideEffects).every((value) => value === false);

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    activationStatus: getString(record, "activationStatus"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    livePublishAttempted: false,
    liveQueuePublishingEnabled: false,
    noLiveSideEffects: noLiveSideEffects as Record<string, false>,
    productionReady: false,
    publishAttemptPolicy: getString(record, "publishAttemptPolicy"),
    publishRequestEvaluated: getBoolean(record, "publishRequestEvaluated"),
    publishResultStatus: getString(record, "publishResultStatus"),
    publisherId: getString(record, "publisherId"),
    publisherProvided: getBoolean(record, "publisherProvided"),
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
  };
};

const summarizeQueuePublishingReadinessFromProviderAdapter = (
  providerAdapter: BackendRuntimeSmokeQueueProviderAdapterSummary | undefined,
): BackendRuntimeSmokeQueuePublishingReadinessSummary | undefined => {
  if (!providerAdapter) {
    return undefined;
  }

  return {
    activationStatus: providerAdapter.driverPublishingActivationStatus,
    blockerCount: providerAdapter.driverPublishingBlockerCount,
    diagnosticCodes: providerAdapter.driverPublishDiagnosticCodes,
    livePublishAttempted: providerAdapter.driverPublishingLivePublishAttempted,
    liveQueuePublishingEnabled: providerAdapter.driverPublishingLiveQueuePublishingEnabled,
    noLiveSideEffects: providerAdapter.driverPublishingNoLiveSideEffects,
    productionReady: false,
    publishAttemptPolicy: providerAdapter.driverPublishAttemptPolicy,
    publishRequestEvaluated: providerAdapter.driverPublishRequestEvaluated,
    publishResultStatus: providerAdapter.driverPublishResultStatus,
    publisherId: providerAdapter.driverPublishingPublisherId,
    publisherProvided: providerAdapter.driverPublishingPublisherProvided,
    requiredConfigKeys: providerAdapter.driverPublishingRequiredConfigKeys,
    status: providerAdapter.driverPublishingStatus,
  };
};

const summarizeQueueProviderAdapter = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeQueueProviderAdapterSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "driverProductionReady")
    && isExplicitFalse(record, "driverLiveQueueConsumptionEnabled")
    && isExplicitFalse(record, "driverLiveQueuePublishingEnabled")
    && isExplicitFalse(record, "driverLiveWorkerExecutionEnabled")
    && isExplicitFalse(record, "driverConsumeAckAttempted")
    && isExplicitFalse(record, "driverConsumeDeadLetterAttempted")
    && isExplicitFalse(record, "driverConsumeNackAttempted")
    && isExplicitFalse(record, "driverConsumeRetryScheduled")
    && isExplicitFalse(record, "driverConsumingLiveConsumeAttempted")
    && isExplicitFalse(record, "driverConsumingLiveQueueConsumptionEnabled")
    && readNestedRecord(record, ["driverConsumingNoLiveSideEffects"]) !== undefined
    && Object.values(readNestedRecord(record, ["driverConsumingNoLiveSideEffects"]) ?? {}).every(
      (value) => value === false,
    )
    && isExplicitFalse(record, "driverPublishingLivePublishAttempted")
    && isExplicitFalse(record, "driverPublishingLiveQueuePublishingEnabled")
    && readNestedRecord(record, ["driverPublishingNoLiveSideEffects"]) !== undefined
    && Object.values(readNestedRecord(record, ["driverPublishingNoLiveSideEffects"]) ?? {}).every(
      (value) => value === false,
    )
    && isExplicitFalse(record, "driverSdkBindingProductionReady")
    && isExplicitFalse(record, "driverSdkBindingSdkClientConstructed")
    && isExplicitFalse(record, "driverSdkBindingLiveProviderCallAttempted")
    && isExplicitFalse(record, "driverSdkBindingLiveQueuePublishingEnabled")
    && isExplicitFalse(record, "driverSdkBindingLiveWorkerExecutionEnabled")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingBrowserBundleAllowed")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveBrokerConnectionAttempted")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveQueuePublishingEnabled")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveWorkerExecutionEnabled")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingSdkClientConstructed")
    && isExplicitFalse(record, "liveQueueConsumptionEnabled")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(record, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    adapterId: getString(record, "adapterId"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    disabledLiveOperationCount: getNumber(record, "disabledLiveOperationCount"),
    driverActivationGateSatisfied: getBoolean(record, "driverActivationGateSatisfied"),
    driverBlockerCount: getNumber(record, "driverBlockerCount"),
    driverDiagnosticCodes: getStringArray(record, "driverDiagnosticCodes"),
    driverDisabledLiveOperationCount: getNumber(record, "driverDisabledLiveOperationCount"),
    driverId: getString(record, "driverId"),
    driverLiveQueueConsumptionEnabled: false,
    driverLiveQueuePublishingEnabled: false,
    driverLiveWorkerExecutionEnabled: false,
    driverMode: getString(record, "driverMode"),
    driverOperationCount: getNumber(record, "driverOperationCount"),
    driverProductionReady: false,
    driverProviderId: getString(record, "driverProviderId"),
    driverConsumeAckAttempted: false,
    driverConsumeAttemptPolicy: getString(record, "driverConsumeAttemptPolicy"),
    driverConsumeDeadLetterAttempted: false,
    driverConsumeDiagnosticCodes: getStringArray(record, "driverConsumeDiagnosticCodes"),
    driverConsumeNackAttempted: false,
    driverConsumeRequestEvaluated: getBoolean(record, "driverConsumeRequestEvaluated"),
    driverConsumeResultStatus: getString(record, "driverConsumeResultStatus"),
    driverConsumeRetryScheduled: false,
    driverConsumingActivationStatus: getString(record, "driverConsumingActivationStatus"),
    driverConsumingBlockerCount: getNumber(record, "driverConsumingBlockerCount"),
    driverConsumingConsumerId: getString(record, "driverConsumingConsumerId"),
    driverConsumingConsumerProvided: getBoolean(record, "driverConsumingConsumerProvided"),
    driverConsumingHandlerRegistryProvided: getBoolean(record, "driverConsumingHandlerRegistryProvided"),
    driverConsumingLiveConsumeAttempted: false,
    driverConsumingLiveQueueConsumptionEnabled: false,
    driverConsumingNoLiveSideEffects: readNestedRecord(record, ["driverConsumingNoLiveSideEffects"]) as Record<string, false>,
    driverConsumingProductionReady: false,
    driverConsumingRequiredConfigKeys: getStringArray(record, "driverConsumingRequiredConfigKeys"),
    driverConsumingStatus: getString(record, "driverConsumingStatus"),
    driverPublishAttemptPolicy: getString(record, "driverPublishAttemptPolicy"),
    driverPublishDiagnosticCodes: getStringArray(record, "driverPublishDiagnosticCodes"),
    driverPublishRequestEvaluated: getBoolean(record, "driverPublishRequestEvaluated"),
    driverPublishResultStatus: getString(record, "driverPublishResultStatus"),
    driverPublishingActivationStatus: getString(record, "driverPublishingActivationStatus"),
    driverPublishingBlockerCount: getNumber(record, "driverPublishingBlockerCount"),
    driverPublishingLivePublishAttempted: false,
    driverPublishingLiveQueuePublishingEnabled: false,
    driverPublishingNoLiveSideEffects: readNestedRecord(record, ["driverPublishingNoLiveSideEffects"]) as Record<string, false>,
    driverPublishingPublisherId: getString(record, "driverPublishingPublisherId"),
    driverPublishingPublisherProvided: getBoolean(record, "driverPublishingPublisherProvided"),
    driverPublishingRequiredConfigKeys: getStringArray(record, "driverPublishingRequiredConfigKeys"),
    driverPublishingStatus: getString(record, "driverPublishingStatus"),
    driverRequiredConfigKeys: getStringArray(record, "driverRequiredConfigKeys"),
    driverSdkBindingActivationGateSatisfied: getBoolean(record, "driverSdkBindingActivationGateSatisfied"),
    driverSdkBindingBlockerCount: getNumber(record, "driverSdkBindingBlockerCount"),
    driverSdkBindingDiagnosticCodes: getStringArray(record, "driverSdkBindingDiagnosticCodes"),
    driverSdkBindingDisabledLiveOperationCount: getNumber(record, "driverSdkBindingDisabledLiveOperationCount"),
    driverSdkBindingId: getString(record, "driverSdkBindingId"),
    driverSdkBindingLiveProviderCallAttempted: false,
    driverSdkBindingLiveQueuePublishingEnabled: false,
    driverSdkBindingLiveWorkerExecutionEnabled: false,
    driverSdkBindingMode: getString(record, "driverSdkBindingMode"),
    driverSdkBindingOperationCount: getNumber(record, "driverSdkBindingOperationCount"),
    driverSdkBindingPackageBindingBrokerConnectionBlockerCount: getNumber(record, "driverSdkBindingPackageBindingBrokerConnectionBlockerCount"),
    driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes: getStringArray(record, "driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes"),
    driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode: getString(record, "driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode"),
    driverSdkBindingPackageBindingBrokerConnectionId: getString(record, "driverSdkBindingPackageBindingBrokerConnectionId"),
    driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys: getStringArray(record, "driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys"),
    driverSdkBindingPackageBindingBrokerConnectionStatus: getString(record, "driverSdkBindingPackageBindingBrokerConnectionStatus"),
    driverSdkBindingPackageBindingBlockerCount: getNumber(record, "driverSdkBindingPackageBindingBlockerCount"),
    driverSdkBindingPackageBindingBrowserBundleAllowed: false,
    driverSdkBindingPackageBindingBullmqConstructionAttempted: getBoolean(record, "driverSdkBindingPackageBindingBullmqConstructionAttempted"),
    driverSdkBindingPackageBindingBullmqConstructionBlockerCount: getNumber(record, "driverSdkBindingPackageBindingBullmqConstructionBlockerCount"),
    driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes: getStringArray(record, "driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes"),
    driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked: getBoolean(record, "driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked"),
    driverSdkBindingPackageBindingBullmqConstructionId: getString(record, "driverSdkBindingPackageBindingBullmqConstructionId"),
    driverSdkBindingPackageBindingBullmqConstructionProductionReady: false,
    driverSdkBindingPackageBindingBullmqConstructionStatus: getString(record, "driverSdkBindingPackageBindingBullmqConstructionStatus"),
    driverSdkBindingPackageBindingDiagnosticCodes: getStringArray(record, "driverSdkBindingPackageBindingDiagnosticCodes"),
    driverSdkBindingPackageBindingFamily: getString(record, "driverSdkBindingPackageBindingFamily"),
    driverSdkBindingPackageBindingId: getString(record, "driverSdkBindingPackageBindingId"),
    driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
    driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted: false,
    driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
    driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
    driverSdkBindingPackageBindingPackageName: getString(record, "driverSdkBindingPackageBindingPackageName"),
    driverSdkBindingPackageBindingPackageRef: getString(record, "driverSdkBindingPackageBindingPackageRef"),
    driverSdkBindingPackageBindingQueueClientConstructed: getBoolean(record, "driverSdkBindingPackageBindingQueueClientConstructed"),
    driverSdkBindingPackageBindingQueueEventsConstructed: getBoolean(record, "driverSdkBindingPackageBindingQueueEventsConstructed"),
    driverSdkBindingPackageBindingSdkClientConstructed: false,
    driverSdkBindingPackageBindingStatus: getString(record, "driverSdkBindingPackageBindingStatus"),
    driverSdkBindingPackageBindingWorkerConstructed: getBoolean(record, "driverSdkBindingPackageBindingWorkerConstructed"),
    driverSdkBindingProductionReady: false,
    driverSdkBindingProviderKind: getString(record, "driverSdkBindingProviderKind"),
    driverSdkBindingQueueRouteCount: getNumber(record, "driverSdkBindingQueueRouteCount"),
    driverSdkBindingRequiredConfigKeys: getStringArray(record, "driverSdkBindingRequiredConfigKeys"),
    driverSdkBindingSdkClientConstructed: false,
    driverSdkBindingSdkPackageRef: getString(record, "driverSdkBindingSdkPackageRef"),
    driverSdkBindingStatus: getString(record, "driverSdkBindingStatus"),
    driverSdkBindingValid: getBoolean(record, "driverSdkBindingValid"),
    driverStatus: getString(record, "driverStatus"),
    driverValid: getBoolean(record, "driverValid"),
    liveQueueConsumptionEnabled: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: getString(record, "mode"),
    operationCount: getNumber(record, "operationCount"),
    productionReady: false,
    providerId: getString(record, "providerId"),
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeSchedulerRuntimeFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeSchedulerRuntimeFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveCronExecutionEnabled")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(record, "liveSchedulerExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveCronExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveQueuePublishingEnabled")
    && isExplicitFalse(noLiveFlags, "liveSchedulerExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    dryRunTriggerEnabled: getBoolean(record, "dryRunTriggerEnabled"),
    id: getString(record, "id"),
    liveCronExecutionEnabled: false,
    liveQueuePublishingEnabled: false,
    liveSchedulerExecutionEnabled: false,
    liveWorkerExecutionEnabled: false,
    productionReady: false,
    registrationCount: getNumber(record, "registrationCount"),
    scheduleIds: getStringArray(record, "scheduleIds"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeWorkerLeaseStoreFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(record, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    adapterId: getString(record, "adapterId"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    disabledLiveOperationCount: getNumber(record, "disabledLiveOperationCount"),
    id: getString(record, "id"),
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: getString(record, "mode"),
    operationCount: getNumber(record, "operationCount"),
    productionReady: false,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
    storeId: getString(record, "storeId"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeWorkerIdempotencyStoreFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveIdempotencyExecutionEnabled")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(record, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    adapterId: getString(record, "adapterId"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    disabledLiveOperationCount: getNumber(record, "disabledLiveOperationCount"),
    id: getString(record, "id"),
    keySchemaVersion: getString(record, "keySchemaVersion"),
    liveIdempotencyExecutionEnabled: false,
    liveQueuePublishingEnabled: false,
    liveWorkerExecutionEnabled: false,
    mode: getString(record, "mode"),
    namespace: getString(record, "namespace"),
    operationCount: getNumber(record, "operationCount"),
    productionReady: false,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    status: getString(record, "status"),
    storeId: getString(record, "storeId"),
    valid: getBoolean(record, "valid"),
  };
};

const summarizeObservabilityExporterFoundation = (
  record: Record<string, unknown> | undefined,
): BackendRuntimeSmokeObservabilityExporterFoundationSummary | undefined => {
  if (!record) {
    return undefined;
  }

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveAlertRoutingEnabled")
    && isExplicitFalse(record, "liveLogExportEnabled")
    && isExplicitFalse(record, "liveMetricsExportEnabled")
    && isExplicitFalse(record, "liveTelemetryExportEnabled")
    && isExplicitFalse(record, "liveTraceExportEnabled")
    && isExplicitFalse(noLiveFlags, "liveAlertRoutingEnabled")
    && isExplicitFalse(noLiveFlags, "liveLogExportEnabled")
    && isExplicitFalse(noLiveFlags, "liveMetricsExportEnabled")
    && isExplicitFalse(noLiveFlags, "liveTelemetryExportEnabled")
    && isExplicitFalse(noLiveFlags, "liveTraceExportEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  return {
    adapterId: getString(record, "adapterId"),
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    disabledLiveOperationCount: getNumber(record, "disabledLiveOperationCount"),
    exporterId: getString(record, "exporterId"),
    id: getString(record, "id"),
    liveAlertRoutingEnabled: false,
    liveLogExportEnabled: false,
    liveMetricsExportEnabled: false,
    liveTelemetryExportEnabled: false,
    liveTraceExportEnabled: false,
    metricNamespace: getString(record, "metricNamespace"),
    mode: getString(record, "mode"),
    operationCount: getNumber(record, "operationCount"),
    productionReady: false,
    requiredConfigKeys: getStringArray(record, "requiredConfigKeys"),
    sinkId: getString(record, "sinkId"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
  };
};

const createSmokeCheck = async ({
  baseUrl,
  endpoint,
  fetchImpl,
  traceId,
}: {
  baseUrl: string;
  endpoint: BackendRuntimeSmokeCheck["endpoint"];
  fetchImpl: typeof fetch;
  traceId: string;
}): Promise<{
  activation?: Record<string, unknown>;
  check: BackendRuntimeSmokeCheck;
}> => {
  const response = await fetchImpl(`${baseUrl}${endpoint}`, {
    headers: { "x-campaign-os-trace-id": traceId },
  });
  const payload = await readJson(response);
  const activation = endpoint === "/api/health"
    ? readNestedRecord(payload.data, ["backendService", "activation"])
    : readNestedRecord(payload.data, ["activation"]);
  const deploymentHandoff = readNestedRecord(activation, ["deploymentHandoff"]);
  const authSessionFoundation = summarizeAuthSessionFoundation(
    readAuthSessionFoundation(payload.data),
  );
  const persistenceFoundation = summarizePersistenceFoundation(
    readPersistenceFoundation(payload.data),
  );
  const providerIndexerFoundation = summarizeProviderIndexerFoundation(
    readProviderIndexerFoundation(payload.data),
  );
  const providerClientReadiness = summarizeProviderClientReadiness(
    readProviderClientReadiness(payload.data),
  );
  const workerSchedulerFoundation = summarizeWorkerSchedulerFoundation(
    readWorkerSchedulerFoundation(payload.data),
  );
  const queueRuntimeFoundation = summarizeQueueRuntimeFoundation(
    readQueueRuntimeFoundation(payload.data),
  );
  const schedulerRuntimeFoundation = summarizeSchedulerRuntimeFoundation(
    readSchedulerRuntimeFoundation(payload.data),
  );
  const workerLeaseStoreFoundation = summarizeWorkerLeaseStoreFoundation(
    readWorkerLeaseStoreFoundation(payload.data),
  );
  const workerIdempotencyStoreFoundation = summarizeWorkerIdempotencyStoreFoundation(
    readWorkerIdempotencyStoreFoundation(payload.data),
  );
  const observabilityExporterFoundation = summarizeObservabilityExporterFoundation(
    readObservabilityExporterFoundation(payload.data),
  );
  const objectStorageExportRuntime = summarizeObjectStorageExportRuntime(
    readObjectStorageExportRuntime(payload.data),
  );
  const analyticsIngestionRuntime = summarizeAnalyticsIngestionRuntime(
    readAnalyticsIngestionRuntime(payload.data),
  );
  const contractWriterRuntime = summarizeContractWriterRuntime(
    readContractWriterRuntime(payload.data),
  );
  const productionBackendReadiness = summarizeProductionBackendReadiness(
    readProductionBackendReadiness(payload.data),
  );

  return {
    activation,
    check: {
      activationPresent: Boolean(activation),
      analyticsIngestionRuntime,
      authSessionFoundation,
      contractWriterRuntime,
      deploymentHandoff,
      endpoint,
      ok: payload.ok === true && payload.traceId === traceId,
      objectStorageExportRuntime,
      observabilityExporterFoundation,
      persistenceFoundation,
      productionBackendReadiness,
      providerClientReadiness,
      providerIndexerFoundation,
      queueRuntimeFoundation,
      schedulerRuntimeFoundation,
      status: response.status,
      traceId: payload.traceId ?? "",
      workerIdempotencyStoreFoundation,
      workerLeaseStoreFoundation,
      workerSchedulerFoundation,
    },
  };
};

const createAnalyticsIngestionRuntimeSmokeSample = async ({
  baseUrl,
  fetchImpl,
  traceId,
}: {
  baseUrl: string;
  fetchImpl: typeof fetch;
  traceId: string;
}): Promise<BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary | undefined> => {
  const response = await fetchImpl(
    `${baseUrl}/api/campaigns/${campaignDetail.id}/analytics/ingestion-readiness`,
    {
      headers: { "x-campaign-os-trace-id": traceId },
    },
  );
  const payload = await readJson(response);
  const readiness = readNestedRecord(payload.data, ["payload"]);
  const summary = summarizeAnalyticsIngestionRuntime(readiness);

  if (response.status !== 200 || payload.ok !== true || payload.traceId !== traceId || !summary) {
    return undefined;
  }

  return {
    ...summary,
    traceId: payload.traceId,
  };
};

const createContractWriterRuntimeSmokeSample = async ({
  baseUrl,
  fetchImpl,
  traceId,
}: {
  baseUrl: string;
  fetchImpl: typeof fetch;
  traceId: string;
}): Promise<BackendRuntimeSmokeContractWriterRuntimeSummary | undefined> => {
  const response = await fetchImpl(
    `${baseUrl}/api/campaigns/${campaignDetail.id}/contract-writer/readiness`,
    {
      headers: { "x-campaign-os-trace-id": traceId },
    },
  );
  const payload = await readJson(response);
  const readiness = readNestedRecord(payload.data, ["payload"]);
  const summary = summarizeContractWriterRuntime(readiness);

  if (response.status !== 200 || payload.ok !== true || payload.traceId !== traceId || !summary) {
    return undefined;
  }

  return {
    ...summary,
    traceId: payload.traceId,
  };
};

const getBoolean = (
  record: Record<string, unknown> | undefined,
  key: string,
): boolean => record?.[key] === true;

const isExplicitFalse = (
  record: Record<string, unknown> | undefined,
  key: string,
): boolean => record?.[key] === false;

const getStringArray = (
  record: Record<string, unknown> | undefined,
  key: string,
): string[] => Array.isArray(record?.[key])
  ? record[key].filter((item): item is string => typeof item === "string")
  : [];

const rewardReleaseScopeBlockerIds = ["reward-custody", "reward-distribution"];

const includesAllRewardReleaseScopeBlockers = (ids: readonly string[]) =>
  rewardReleaseScopeBlockerIds.every((id) => ids.includes(id));

const excludesRewardReleaseScopeBlockers = (ids: readonly string[]) =>
  rewardReleaseScopeBlockerIds.every((id) => !ids.includes(id));

const isReleaseScopeSmokeReady = (
  activation: Record<string, unknown> | undefined,
  deploymentHandoff: Record<string, unknown> | undefined,
): boolean => {
  const mvpReleaseBlockerIds = getStringArray(activation, "mvpReleaseBlockerIds");
  const futureProductionBlockerIds = getStringArray(activation, "futureProductionBlockerIds");
  const requiredBeforeMvpRelease = getStringArray(deploymentHandoff, "requiredBeforeMvpRelease");
  const futureProduction = getStringArray(deploymentHandoff, "futureProduction");

  return getBoolean(activation, "mvpReleaseReady")
    && excludesRewardReleaseScopeBlockers(mvpReleaseBlockerIds)
    && excludesRewardReleaseScopeBlockers(requiredBeforeMvpRelease)
    && includesAllRewardReleaseScopeBlockers(futureProductionBlockerIds)
    && includesAllRewardReleaseScopeBlockers(futureProduction);
};

const durableLocalSmokeTraceIds = {
  exportPreview: "campaign-os-smoke-durable-export-preview",
  firstHealth: "campaign-os-smoke-durable-health-first",
  restartedHealth: "campaign-os-smoke-durable-health-restarted",
  verification: "campaign-os-smoke-durable-verification",
  walletSession: "campaign-os-smoke-durable-wallet-session",
} as const;

const withDurableLocalPersistenceEnv = async (
  env: Record<string, string | undefined> | undefined,
): Promise<{
  cleanupDir?: string;
  env: Record<string, string | undefined>;
}> => {
  if (env?.CAMPAIGN_OS_PERSISTENCE_DIR) {
    return {
      env: {
        ...env,
        CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
      },
    };
  }

  const cleanupDir = await mkdtemp(join(tmpdir(), "campaign-os-smoke-local-json-"));

  return {
    cleanupDir,
    env: {
      ...env,
      CAMPAIGN_OS_PERSISTENCE_DIR: cleanupDir,
      CAMPAIGN_OS_PERSISTENCE_MODE: "local_json",
    },
  };
};

const readPersistenceHealth = (payload: SmokePayload): Record<string, unknown> | undefined =>
  readNestedRecord(payload.data, ["persistence"]);

const requirePersistenceHealth = (
  payload: SmokePayload,
  traceId: string,
): Record<string, unknown> => {
  if (payload.ok !== true || payload.traceId !== traceId) {
    throw new Error("Campaign OS durable local persistence smoke check failed.");
  }

  const persistence = readPersistenceHealth(payload);

  if (!persistence) {
    throw new Error("Campaign OS durable local persistence health metadata is missing.");
  }

  return persistence;
};

const postDurableLocalSmokeRecord = async ({
  baseUrl,
  body,
  fetchImpl,
  path,
  traceId,
}: {
  baseUrl: string;
  body: Record<string, unknown>;
  fetchImpl: typeof fetch;
  path: string;
  traceId: string;
}): Promise<string> => {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-campaign-os-trace-id": traceId,
    },
    method: "POST",
  });
  const payload = await readJson(response);
  const persistence = readNestedRecord(payload.data, ["persistence"]);
  const kind = getString(persistence, "kind");

  if (response.status !== 200 || payload.ok !== true || payload.traceId !== traceId || !kind) {
    throw new Error("Campaign OS durable local persistence write smoke check failed.");
  }

  return kind;
};

const readDurableHealth = async (
  baseUrl: string,
  fetchImpl: typeof fetch,
  traceId: string,
): Promise<Record<string, unknown>> => {
  const response = await fetchImpl(`${baseUrl}/api/health`, {
    headers: { "x-campaign-os-trace-id": traceId },
  });
  const payload = await readJson(response);

  if (response.status !== 200) {
    throw new Error("Campaign OS durable local persistence health smoke check failed.");
  }

  return requirePersistenceHealth(payload, traceId);
};

const latestRecordKinds = (
  persistence: Record<string, unknown>,
): string[] => Array.isArray(persistence.latestRecords)
  ? persistence.latestRecords
    .filter(isRecord)
    .map((record) => getString(record, "kind"))
    .filter((kind): kind is string => typeof kind === "string")
  : [];

const countsByKind = (
  persistence: Record<string, unknown>,
): Record<string, number> => {
  const counts = readNestedRecord(persistence, ["countsByKind"]) ?? {};

  return Object.fromEntries(
    Object.entries(counts)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number"),
  );
};

const assertDurableLocalPersistenceHealth = (
  persistence: Record<string, unknown>,
  expectedRecordCount: number,
) => {
  const expectedKinds = ["wallet_session", "verification_attempt", "export_preview"];

  if (
    getString(persistence, "mode") !== "local_json"
    || persistence.durable !== true
    || persistence.localOnly !== true
    || persistence.noMigrationRunner !== true
    || persistence.noProductionDatabase !== true
    || persistence.noSecretHandling !== true
    || getNumber(persistence, "recordCount") < expectedRecordCount
  ) {
    throw new Error("Campaign OS durable local persistence health smoke check failed.");
  }

  const currentCounts = countsByKind(persistence);
  const currentLatestKinds = latestRecordKinds(persistence);
  const hasExpectedKinds = expectedKinds.every(
    (kind) => (currentCounts[kind] ?? 0) >= 1 && currentLatestKinds.includes(kind),
  );

  if (!hasExpectedKinds) {
    throw new Error("Campaign OS durable local persistence restart records are incomplete.");
  }
};

const runDurableLocalPersistenceSmoke = async ({
  env,
  fetchImpl,
  host,
  logger,
  server,
  shutdownTimeoutMs,
}: {
  env: Record<string, string | undefined>;
  fetchImpl: typeof fetch;
  host: string;
  logger: BackendRuntimeSmokeOptions["logger"];
  server: CampaignOsApiServerHandle;
  shutdownTimeoutMs?: number;
}): Promise<BackendRuntimeSmokeDurableLocalPersistenceSummary> => {
  const wroteRecordKinds = [
    await postDurableLocalSmokeRecord({
      baseUrl: server.url,
      body: {
        adapterName: "PortkeyDiscoverWallet",
        fixtureId: "sess-eoa-app-001",
      },
      fetchImpl,
      path: "/api/wallet/session",
      traceId: durableLocalSmokeTraceIds.walletSession,
    }),
    await postDurableLocalSmokeRecord({
      baseUrl: server.url,
      body: {
        accountType: "AA",
        campaignId: campaignDetail.id,
        walletAddress: "2F4...9aB",
        walletSource: "PORTKEY_AA",
      },
      fetchImpl,
      path: "/api/tasks/task-bridge/verify",
      traceId: durableLocalSmokeTraceIds.verification,
    }),
    await postDurableLocalSmokeRecord({
      baseUrl: server.url,
      body: {
        contractRootMode: "none",
        format: "json",
        includeLocalePreference: true,
        includeRiskFlags: true,
        includeWalletType: true,
      },
      fetchImpl,
      path: `/api/campaigns/${campaignDetail.id}/export`,
      traceId: durableLocalSmokeTraceIds.exportPreview,
    }),
  ];
  const firstPersistence = await readDurableHealth(
    server.url,
    fetchImpl,
    durableLocalSmokeTraceIds.firstHealth,
  );

  assertDurableLocalPersistenceHealth(firstPersistence, 3);
  await server.stop();

  const restartedServer = await startCampaignOsApiServer({
    env,
    host,
    logger,
    port: 0,
    shutdownTimeoutMs,
  });

  try {
    const restartedPersistence = await readDurableHealth(
      restartedServer.url,
      fetchImpl,
      durableLocalSmokeTraceIds.restartedHealth,
    );

    assertDurableLocalPersistenceHealth(restartedPersistence, getNumber(firstPersistence, "recordCount"));

    return {
      adapterLabel: getString(restartedPersistence, "adapterLabel"),
      countsByKind: countsByKind(restartedPersistence),
      durable: true,
      latestRecordKinds: latestRecordKinds(restartedPersistence),
      localOnly: true,
      mode: "local_json",
      noMigrationRunner: true,
      noProductionDatabase: true,
      noSecretHandling: true,
      recordCount: getNumber(firstPersistence, "recordCount"),
      restartedRecordCount: getNumber(restartedPersistence, "recordCount"),
      status: "passed",
      traceIds: durableLocalSmokeTraceIds,
      wroteRecordKinds,
    };
  } finally {
    await restartedServer.stop();
  }
};

const isPersistenceFoundationSmokeReady = (
  summary: BackendRuntimeSmokePersistenceFoundationSummary | undefined,
): summary is BackendRuntimeSmokePersistenceFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveConnectionAttempted === false
    && summary.liveMigrationExecutionEnabled === false
    && summary.liveQueryExecutionEnabled === false
    && summary.storeCoverageCount >= 6
    && summary.blockerCount > 0
    && summary.diagnosticCodes.length > 0;
};

const isAuthSessionFoundationSmokeReady = (
  summary: BackendRuntimeSmokeAuthSessionFoundationSummary | undefined,
): summary is BackendRuntimeSmokeAuthSessionFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveSideEffectsEnabled === false
    && summary.liveSigningExecuted === false
    && summary.liveVerificationExecuted === false
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isObjectStorageExportRuntimeSmokeReady = (
  summary: BackendRuntimeSmokeObjectStorageExportRuntimeSummary | undefined,
): summary is BackendRuntimeSmokeObjectStorageExportRuntimeSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.downloadEnabled === false
    && summary.objectKeyCreated === false
    && summary.providerCallAttempted === false
    && summary.signedUrlCreated === false
    && summary.localReviewOnly === true
    && summary.manifestOnly === true
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_OBJECT_STORAGE_PROVIDER_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_OBJECT_STORAGE_APPROVAL_REF")
    && summary.diagnosticCodes.includes("OBJECT_STORAGE_LIVE_EXECUTION_DISABLED")
    && summary.status === "blocked"
    && summary.valid === true;
};

const isAnalyticsIngestionRuntimeSmokeReady = (
  summary: BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary | undefined,
): summary is BackendRuntimeSmokeAnalyticsIngestionRuntimeSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveAnalyticsSdkExecuted === false
    && summary.liveEventIngestionEnabled === false
    && summary.liveEventWarehouseWrite === false
    && summary.eventCatalogCount >= 9
    && summary.metricLineageCount >= 9
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_ANALYTICS_WAREHOUSE_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_ANALYTICS_APPROVAL_REF")
    && summary.diagnosticCodes.includes("ANALYTICS_LIVE_EXECUTION_DISABLED")
    && summary.status === "blocked"
    && summary.valid === true
    && summary.warehouseStatus === "missing";
};

const isContractWriterRuntimeSmokeReady = (
  summary: BackendRuntimeSmokeContractWriterRuntimeSummary | undefined,
): summary is BackendRuntimeSmokeContractWriterRuntimeSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveSignerExecution === false
    && summary.liveWalletSignature === false
    && summary.liveContractWrite === false
    && summary.liveQueuePublishing === false
    && summary.liveRewardCustody === false
    && summary.liveRewardDistribution === false
    && summary.operationGroupCount >= 4
    && summary.operationCount >= 20
    && contractWriterRequiredConfigKeys.every((key) => summary.requiredConfigKeys.includes(key))
    && summary.diagnosticCodes.includes("CONTRACT_WRITER_LIVE_EXECUTION_DISABLED")
    && summary.status === "blocked"
    && summary.configStatus === "missing"
    && summary.valid === true;
};

const isProviderIndexerFoundationSmokeReady = (
  summary: BackendRuntimeSmokeProviderIndexerFoundationSummary | undefined,
): summary is BackendRuntimeSmokeProviderIndexerFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveProviderCallsEnabled === false
    && summary.liveIndexerCallsEnabled === false
    && summary.liveSocialCallsEnabled === false
    && summary.liveAiCallsEnabled === false
    && summary.liveAnalyticsIngestionEnabled === false
    && summary.liveObjectStorageEnabled === false
    && summary.liveContractCallsEnabled === false
    && summary.workerExecutionEnabled === false
    && summary.providerGroupCount >= 10
    && summary.verificationSourceCoverageCount >= 5
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isProviderClientReadinessSmokeReady = (
  summary: BackendRuntimeSmokeProviderClientReadinessSummary | undefined,
): summary is BackendRuntimeSmokeProviderClientReadinessSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveProviderCallsAttempted === false
    && summary.providerClientsEnabled === false
    && summary.providerClientsProvided === false
    && summary.activationStatus === "disabled"
    && summary.blockerCount === 0
    && summary.diagnosticCodes.length === 0
    && summary.providerHttpRuntime.productionReady === false
    && summary.providerHttpRuntime.liveHttpCallsAttempted === false
    && summary.providerHttpRuntime.status === "disabled"
    && summary.providerHttpRuntime.activationStatus === "disabled"
    && summary.providerHttpRuntime.endpointCount >= 13
    && summary.providerHttpRuntime.endpointRollout.enabledCount >= 11
    && summary.providerHttpRuntime.endpointRollout.deferredCount >= 2
    && summary.providerHttpRuntime.endpointRollout.providerFamilies.includes("aefinder")
    && summary.providerHttpRuntime.endpointRollout.providerFamilies.includes("aelfscan")
    && summary.providerHttpRuntime.endpointRollout.requiredConfigKeys.some((key) =>
      key.startsWith("CAMPAIGN_OS_PROVIDER_HTTP_AEFINDER")
    )
    && summary.providerHttpRuntime.transportProvided === false
    && summary.providerHttpRuntime.valid === true
    && summary.queueHandoffStatus === "disabled"
    && summary.registryClientCount === 0
    && summary.registryProviderGroupCount >= 5
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_CLIENT_ENABLEMENT")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_REGISTRY_URL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_ENDPOINT_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_CREDENTIAL_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_CLIENT_SEAM")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_CONSUME_READINESS_HANDOFF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_PROVIDER_REDACTION_POLICY")
    && summary.status === "disabled"
    && summary.valid === true;
};

const isWorkerSchedulerFoundationSmokeReady = (
  summary: BackendRuntimeSmokeWorkerSchedulerFoundationSummary | undefined,
): summary is BackendRuntimeSmokeWorkerSchedulerFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.liveSchedulerExecutionEnabled === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveCronExecutionEnabled === false
    && summary.jobCatalogCount > 0
    && summary.schedulePolicyCount > 0
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isWorkerLeaseStoreFoundationSmokeReady = (
  summary: BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary | undefined,
): summary is BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.storeId === "local-dry-run"
    && summary.adapterId === "local-dry-run-worker-lease-store-adapter"
    && summary.mode === "dry_run"
    && summary.operationCount >= 8
    && summary.disabledLiveOperationCount === summary.operationCount
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_WORKER_LEASE_STORE")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_WORKER_LEASE_STORE_URL")
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isWorkerIdempotencyStoreFoundationSmokeReady = (
  summary: BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary | undefined,
): summary is BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveIdempotencyExecutionEnabled === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.storeId === "local-dry-run"
    && summary.adapterId === "local-dry-run-worker-idempotency-store-adapter"
    && summary.mode === "dry_run"
    && summary.namespace === "campaign-os-workers"
    && summary.keySchemaVersion === "v1"
    && summary.operationCount >= 8
    && summary.disabledLiveOperationCount === summary.operationCount
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_IDEMPOTENCY_STORE")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_IDEMPOTENCY_STORE_URL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_IDEMPOTENCY_STORE_CREDENTIALS")
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isQueueRuntimeFoundationSmokeReady = (
  summary: BackendRuntimeSmokeQueueRuntimeFoundationSummary | undefined,
): summary is BackendRuntimeSmokeQueueRuntimeFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveQueueConsumptionEnabled === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.liveSchedulerExecutionEnabled === false
    && summary.liveCronExecutionEnabled === false
    && summary.queuePlanCount >= 9
    && summary.dryRunEnqueueEnabled === true
    && isQueueConsumingSmokeReady(summary.liveQueueConsumingReadiness)
    && isQueuePublishingSmokeReady(summary.liveQueuePublishingReadiness)
    && isQueueProviderAdapterSmokeReady(summary.providerAdapter)
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isQueueConsumingSmokeReady = (
  summary: BackendRuntimeSmokeQueueConsumingReadinessSummary | undefined,
): summary is BackendRuntimeSmokeQueueConsumingReadinessSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.ackAttempted === false
    && summary.deadLetterAttempted === false
    && summary.liveConsumeAttempted === false
    && summary.liveQueueConsumptionEnabled === false
    && summary.nackAttempted === false
    && summary.retryScheduled === false
    && summary.activationStatus === "disabled"
    && summary.blockerCount === 0
    && summary.diagnosticCodes.length === 0
    && summary.consumeAttemptPolicy === "disabled_no_live"
    && summary.consumeRequestEvaluated === false
    && summary.consumeResultStatus === "not_requested"
    && summary.consumerId === "not_configured"
    && summary.consumerProvided === false
    && summary.handlerRegistryProvided === false
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_CONSUMER")
    && summary.status === "disabled"
    && Object.values(summary.noLiveSideEffects).every((value) => value === false);
};

const isQueuePublishingSmokeReady = (
  summary: BackendRuntimeSmokeQueuePublishingReadinessSummary | undefined,
): summary is BackendRuntimeSmokeQueuePublishingReadinessSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.livePublishAttempted === false
    && summary.liveQueuePublishingEnabled === false
    && summary.activationStatus === "disabled"
    && summary.blockerCount === 0
    && summary.diagnosticCodes.length === 0
    && summary.publishAttemptPolicy === "disabled_no_live"
    && summary.publishRequestEvaluated === false
    && summary.publishResultStatus === "not_requested"
    && summary.publisherId === "not_configured"
    && summary.publisherProvided === false
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER")
    && summary.status === "disabled"
    && Object.values(summary.noLiveSideEffects).every((value) => value === false);
};

const isQueueProviderAdapterSmokeReady = (
  summary: BackendRuntimeSmokeQueueProviderAdapterSummary | undefined,
): summary is BackendRuntimeSmokeQueueProviderAdapterSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.providerId === "local-dry-run"
    && summary.adapterId === "local-dry-run-queue-provider-adapter"
    && summary.mode === "dry_run"
    && summary.driverProviderId === "local-fake"
    && summary.driverId === "local-fake-queue-provider-driver"
    && summary.driverMode === "dry_run"
    && summary.driverStatus === "local_ready"
    && summary.driverValid === true
    && summary.driverActivationGateSatisfied === false
    && summary.driverProductionReady === false
    && summary.driverLiveQueueConsumptionEnabled === false
    && summary.driverLiveQueuePublishingEnabled === false
    && summary.driverLiveWorkerExecutionEnabled === false
    && summary.driverConsumingActivationStatus === "disabled"
    && summary.driverConsumingBlockerCount === 0
    && summary.driverConsumingLiveConsumeAttempted === false
    && summary.driverConsumingLiveQueueConsumptionEnabled === false
    && summary.driverConsumeAckAttempted === false
    && summary.driverConsumeDeadLetterAttempted === false
    && summary.driverConsumeNackAttempted === false
    && summary.driverConsumeRetryScheduled === false
    && summary.driverConsumeAttemptPolicy === "disabled_no_live"
    && summary.driverConsumeResultStatus === "not_requested"
    && summary.driverConsumingConsumerId === "not_configured"
    && summary.driverConsumingConsumerProvided === false
    && summary.driverConsumingHandlerRegistryProvided === false
    && summary.driverConsumingRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_CONSUME_ENABLEMENT")
    && summary.driverConsumingRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_CONSUMER")
    && summary.driverConsumingStatus === "disabled"
    && Object.values(summary.driverConsumingNoLiveSideEffects).every((value) => value === false)
    && summary.driverPublishingActivationStatus === "disabled"
    && summary.driverPublishingBlockerCount === 0
    && summary.driverPublishingLivePublishAttempted === false
    && summary.driverPublishingLiveQueuePublishingEnabled === false
    && summary.driverPublishAttemptPolicy === "disabled_no_live"
    && summary.driverPublishResultStatus === "not_requested"
    && summary.driverPublishingPublisherId === "not_configured"
    && summary.driverPublishingPublisherProvided === false
    && summary.driverPublishingRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_PUBLISHING_ENABLEMENT")
    && summary.driverPublishingRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_PUBLISHER")
    && summary.driverPublishingStatus === "disabled"
    && Object.values(summary.driverPublishingNoLiveSideEffects).every((value) => value === false)
    && summary.driverOperationCount >= 8
    && summary.driverDisabledLiveOperationCount === summary.driverOperationCount
    && summary.driverBlockerCount === 0
    && summary.driverDiagnosticCodes.length === 0
    && summary.driverRequiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER_DRIVER")
    && summary.driverRequiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT")
    && summary.driverRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT")
    && summary.driverSdkBindingId === "local-stub-queue-provider-sdk-binding"
    && summary.driverSdkBindingProviderKind === "local-stub"
    && summary.driverSdkBindingSdkPackageRef === "local-stub-sdk-package"
    && summary.driverSdkBindingMode === "dry_run"
    && summary.driverSdkBindingStatus === "local_ready"
    && summary.driverSdkBindingValid === true
    && summary.driverSdkBindingActivationGateSatisfied === false
    && summary.driverSdkBindingProductionReady === false
    && summary.driverSdkBindingSdkClientConstructed === false
    && summary.driverSdkBindingLiveProviderCallAttempted === false
    && summary.driverSdkBindingLiveQueuePublishingEnabled === false
    && summary.driverSdkBindingLiveWorkerExecutionEnabled === false
    && summary.driverSdkBindingOperationCount >= 8
    && summary.driverSdkBindingDisabledLiveOperationCount === summary.driverSdkBindingOperationCount
    && summary.driverSdkBindingBlockerCount === 0
    && summary.driverSdkBindingDiagnosticCodes.length === 0
    && summary.driverSdkBindingRequiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER_SDK_PACKAGE")
    && summary.driverSdkBindingRequiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER_BINDING")
    && summary.driverSdkBindingRequiredConfigKeys.includes("CAMPAIGN_OS_LIVE_QUEUE_ENABLEMENT")
    && summary.driverSdkBindingPackageBindingId === "bullmq-redis-package-binding-local"
    && summary.driverSdkBindingPackageBindingFamily === "bullmq-redis-compatible"
    && summary.driverSdkBindingPackageBindingPackageName === "bullmq"
    && summary.driverSdkBindingPackageBindingPackageRef === "npm:bullmq"
    && summary.driverSdkBindingPackageBindingStatus === "local_ready"
    && summary.driverSdkBindingPackageBindingBrokerConnectionId === "redis-broker-connection-local"
    && summary.driverSdkBindingPackageBindingBrokerConnectionStatus === "local_ready"
    && summary.driverSdkBindingPackageBindingBrokerConnectionHealthCheckMode === "disabled"
    && summary.driverSdkBindingPackageBindingBrokerConnectionBlockerCount === 0
    && summary.driverSdkBindingPackageBindingBrokerConnectionDiagnosticCodes.length === 0
    && summary.driverSdkBindingPackageBindingBrokerConnectionRequiredConfigKeys.includes("CAMPAIGN_OS_REDIS_BROKER_HEALTH_CHECK_ENABLEMENT")
    && summary.driverSdkBindingPackageBindingBrowserBundleAllowed === false
    && summary.driverSdkBindingPackageBindingBullmqConstructionId === "bullmq-construction-local"
    && summary.driverSdkBindingPackageBindingBullmqConstructionStatus === "local_ready"
    && summary.driverSdkBindingPackageBindingBullmqConstructionAttempted === false
    && summary.driverSdkBindingPackageBindingBullmqConstructionFactoryInvoked === false
    && summary.driverSdkBindingPackageBindingBullmqConstructionProductionReady === false
    && summary.driverSdkBindingPackageBindingBullmqConstructionBlockerCount === 0
    && summary.driverSdkBindingPackageBindingBullmqConstructionDiagnosticCodes.length === 0
    && summary.driverSdkBindingPackageBindingLiveBrokerConnectionAttempted === false
    && summary.driverSdkBindingPackageBindingLiveBrokerHealthCheckAttempted === false
    && summary.driverSdkBindingPackageBindingLiveQueuePublishingEnabled === false
    && summary.driverSdkBindingPackageBindingLiveWorkerExecutionEnabled === false
    && summary.driverSdkBindingPackageBindingQueueClientConstructed === false
    && summary.driverSdkBindingPackageBindingQueueEventsConstructed === false
    && summary.driverSdkBindingPackageBindingSdkClientConstructed === false
    && summary.driverSdkBindingPackageBindingWorkerConstructed === false
    && summary.driverSdkBindingPackageBindingBlockerCount === 0
    && summary.driverSdkBindingPackageBindingDiagnosticCodes.length === 0
    && summary.operationCount >= 8
    && summary.disabledLiveOperationCount === summary.operationCount
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_QUEUE_PROVIDER_ENDPOINT")
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isSchedulerRuntimeFoundationSmokeReady = (
  summary: BackendRuntimeSmokeSchedulerRuntimeFoundationSummary | undefined,
): summary is BackendRuntimeSmokeSchedulerRuntimeFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.liveSchedulerExecutionEnabled === false
    && summary.liveQueuePublishingEnabled === false
    && summary.liveCronExecutionEnabled === false
    && summary.registrationCount >= 9
    && summary.scheduleIds.length >= 9
    && summary.dryRunTriggerEnabled === true
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isObservabilityExporterFoundationSmokeReady = (
  summary: BackendRuntimeSmokeObservabilityExporterFoundationSummary | undefined,
): summary is BackendRuntimeSmokeObservabilityExporterFoundationSummary => {
  if (!summary) {
    return false;
  }

  return summary.productionReady === false
    && summary.liveAlertRoutingEnabled === false
    && summary.liveLogExportEnabled === false
    && summary.liveMetricsExportEnabled === false
    && summary.liveTelemetryExportEnabled === false
    && summary.liveTraceExportEnabled === false
    && summary.exporterId === "local-dry-run"
    && summary.sinkId === "local-metrics-sink"
    && summary.adapterId === "local-dry-run-observability-exporter-adapter"
    && summary.mode === "dry_run"
    && summary.metricNamespace === "campaign-os-runtime"
    && summary.operationCount >= 8
    && summary.disabledLiveOperationCount === summary.operationCount
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_OBSERVABILITY_EXPORTER")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_OBSERVABILITY_EXPORTER_URL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_OBSERVABILITY_SINK")
    && summary.status === "local_ready"
    && summary.valid === true;
};

const isProductionBackendReadinessSmokeReady = (
  summary: BackendRuntimeSmokeProductionBackendReadinessSummary | undefined,
): summary is BackendRuntimeSmokeProductionBackendReadinessSummary =>
  summary !== undefined
  && summary.contractsEndpoint === "/api/contracts"
  && isDatabasePackageBindingSmokeReady(summary.databasePackageBinding)
  && summary.healthEndpoint === "/api/health"
  && summary.missingApiSkillIds.length === 0
  && summary.noLiveSideEffectsAllFalse === true
  && summary.productionReady === false
  && summary.routeCount > 0
  && summary.smokeCommand === "npm run server:smoke"
  && summary.startCommand === "npm run server:start"
  && summary.traceHeaderName === "x-campaign-os-trace-id";

const isDatabasePackageBindingSmokeReady = (
  summary: BackendRuntimeSmokeDatabasePackageBindingSummary | undefined,
): summary is BackendRuntimeSmokeDatabasePackageBindingSummary => {
  if (!summary) {
    return false;
  }

  return summary.bindingId === "campaign-os-postgresql-package-binding-local"
    && Number.isFinite(summary.blockerCount)
    && summary.liveConnectionAttempted === false
    && summary.liveContractWritesEnabled === false
    && summary.liveMigrationExecutionEnabled === false
    && summary.liveProductionMutationEnabled === false
    && summary.liveProviderCallsEnabled === false
    && summary.liveQueryExecutionEnabled === false
    && summary.liveRewardCustodyEnabled === false
    && summary.liveRewardDistributionEnabled === false
    && summary.liveStorageWritesEnabled === false
    && summary.liveTransactionExecutionEnabled === false
    && summary.noLiveFlagsAllFalse === true
    && summary.packageName === "pg"
    && summary.packageRef === "npm:pg"
    && summary.productionReady === false
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_PACKAGE")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_PACKAGE_BINDING")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_PROVIDER")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_URL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_SECRET_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_POOL_POLICY")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_MIGRATION_APPROVAL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_ROLLBACK_BACKUP_PLAN")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_OBSERVABILITY_REF")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_RUNBOOK_URL")
    && summary.requiredConfigKeys.includes("CAMPAIGN_OS_DATABASE_LIVE_ENABLEMENT")
    && (summary.status === "local_ready" || summary.status === "blocked");
};

export const runBackendRuntimeSmoke = async ({
  env,
  fetchImpl = fetch,
  host = "127.0.0.1",
  logger = false,
  port = 0,
  shutdownTimeoutMs,
}: BackendRuntimeSmokeOptions = {}): Promise<BackendRuntimeSmokeSummary> => {
  const durableEnv = await withDurableLocalPersistenceEnv(env);
  const server = await startCampaignOsApiServer({
    env: durableEnv.env,
    host,
    logger,
    port,
    shutdownTimeoutMs,
  });

  let summaryDraft: Omit<BackendRuntimeSmokeSummary, "shutdownState"> | undefined;

  try {
    const health = await createSmokeCheck({
      baseUrl: server.url,
      endpoint: "/api/health",
      fetchImpl,
      traceId: "campaign-os-smoke-health",
    });
    const contracts = await createSmokeCheck({
      baseUrl: server.url,
      endpoint: "/api/contracts",
      fetchImpl,
      traceId: "campaign-os-smoke-contracts",
    });
    const activation = contracts.activation ?? health.activation;
    const deploymentHandoff = readNestedRecord(activation, ["deploymentHandoff"]);
    const authSessionFoundation = contracts.check.authSessionFoundation;
    const persistenceFoundation = contracts.check.persistenceFoundation;
    const providerIndexerFoundation = contracts.check.providerIndexerFoundation;
    const providerClientReadiness = contracts.check.providerClientReadiness;
    const queueRuntimeFoundation = contracts.check.queueRuntimeFoundation;
    const schedulerRuntimeFoundation = contracts.check.schedulerRuntimeFoundation;
    const workerIdempotencyStoreFoundation = contracts.check.workerIdempotencyStoreFoundation;
    const workerLeaseStoreFoundation = contracts.check.workerLeaseStoreFoundation;
    const workerSchedulerFoundation = contracts.check.workerSchedulerFoundation;
    const observabilityExporterFoundation = contracts.check.observabilityExporterFoundation;
    const objectStorageExportRuntime = contracts.check.objectStorageExportRuntime;
    const analyticsIngestionRuntime = contracts.check.analyticsIngestionRuntime;
    const contractWriterRuntime = contracts.check.contractWriterRuntime;
    const productionBackendReadiness = contracts.check.productionBackendReadiness;
    const analyticsIngestionRuntimeSample = await createAnalyticsIngestionRuntimeSmokeSample({
      baseUrl: server.url,
      fetchImpl,
      traceId: "campaign-os-smoke-analytics-ingestion-readiness",
    });
    const contractWriterRuntimeSample = await createContractWriterRuntimeSmokeSample({
      baseUrl: server.url,
      fetchImpl,
      traceId: "campaign-os-smoke-contract-writer-readiness",
    });

    if (
      health.check.status !== 200
      || contracts.check.status !== 200
      || !health.check.ok
      || !contracts.check.ok
      || !health.check.activationPresent
      || !contracts.check.activationPresent
      || !isExplicitFalse(activation, "productionReady")
      || !isExplicitFalse(activation, "liveSideEffectsEnabled")
      || !isReleaseScopeSmokeReady(activation, deploymentHandoff)
      || !isAuthSessionFoundationSmokeReady(health.check.authSessionFoundation)
      || !isAuthSessionFoundationSmokeReady(authSessionFoundation)
      || !isPersistenceFoundationSmokeReady(health.check.persistenceFoundation)
      || !isPersistenceFoundationSmokeReady(persistenceFoundation)
      || !isProviderIndexerFoundationSmokeReady(health.check.providerIndexerFoundation)
      || !isProviderIndexerFoundationSmokeReady(providerIndexerFoundation)
      || !isProviderClientReadinessSmokeReady(health.check.providerClientReadiness)
      || !isProviderClientReadinessSmokeReady(providerClientReadiness)
      || !isQueueRuntimeFoundationSmokeReady(health.check.queueRuntimeFoundation)
      || !isQueueRuntimeFoundationSmokeReady(queueRuntimeFoundation)
      || !isSchedulerRuntimeFoundationSmokeReady(health.check.schedulerRuntimeFoundation)
      || !isSchedulerRuntimeFoundationSmokeReady(schedulerRuntimeFoundation)
      || !isObservabilityExporterFoundationSmokeReady(health.check.observabilityExporterFoundation)
      || !isObservabilityExporterFoundationSmokeReady(observabilityExporterFoundation)
      || !isObjectStorageExportRuntimeSmokeReady(health.check.objectStorageExportRuntime)
      || !isObjectStorageExportRuntimeSmokeReady(objectStorageExportRuntime)
      || !isAnalyticsIngestionRuntimeSmokeReady(health.check.analyticsIngestionRuntime)
      || !isAnalyticsIngestionRuntimeSmokeReady(analyticsIngestionRuntime)
      || !isAnalyticsIngestionRuntimeSmokeReady(analyticsIngestionRuntimeSample)
      || !isContractWriterRuntimeSmokeReady(health.check.contractWriterRuntime)
      || !isContractWriterRuntimeSmokeReady(contractWriterRuntime)
      || !isContractWriterRuntimeSmokeReady(contractWriterRuntimeSample)
      || !isProductionBackendReadinessSmokeReady(health.check.productionBackendReadiness)
      || !isProductionBackendReadinessSmokeReady(productionBackendReadiness)
      || !isWorkerIdempotencyStoreFoundationSmokeReady(health.check.workerIdempotencyStoreFoundation)
      || !isWorkerIdempotencyStoreFoundationSmokeReady(workerIdempotencyStoreFoundation)
      || !isWorkerLeaseStoreFoundationSmokeReady(health.check.workerLeaseStoreFoundation)
      || !isWorkerLeaseStoreFoundationSmokeReady(workerLeaseStoreFoundation)
      || !isWorkerSchedulerFoundationSmokeReady(health.check.workerSchedulerFoundation)
      || !isWorkerSchedulerFoundationSmokeReady(workerSchedulerFoundation)
    ) {
      throw new Error("Campaign OS backend runtime smoke check failed.");
    }

    const durableLocalPersistence = await runDurableLocalPersistenceSmoke({
      env: durableEnv.env,
      fetchImpl,
      host,
      logger,
      server,
      shutdownTimeoutMs,
    });

    summaryDraft = {
      activationId: typeof activation?.id === "string" ? activation.id : undefined,
      authSessionFoundation,
      checks: {
        contracts: contracts.check,
        health: health.check,
      },
      durableLocalPersistence,
      host,
      liveSideEffectsEnabled: getBoolean(activation, "liveSideEffectsEnabled"),
      analyticsIngestionRuntime: analyticsIngestionRuntimeSample,
      contractWriterRuntime: contractWriterRuntimeSample,
      objectStorageExportRuntime,
      observabilityExporterFoundation,
      persistenceFoundation,
      productionBackendReadiness,
      providerClientReadiness,
      port: new URL(server.url).port ? Number(new URL(server.url).port) : 0,
      futureProduction: getStringArray(deploymentHandoff, "futureProduction"),
      futureProductionBlockerIds: getStringArray(activation, "futureProductionBlockerIds"),
      mvpReleaseBlockerIds: getStringArray(activation, "mvpReleaseBlockerIds"),
      mvpReleaseReady: getBoolean(activation, "mvpReleaseReady"),
      productionReady: getBoolean(activation, "productionReady"),
      providerIndexerFoundation,
      queueRuntimeFoundation,
      requiredBeforeMvpRelease: getStringArray(deploymentHandoff, "requiredBeforeMvpRelease"),
      requiredBeforeProduction: getStringArray(deploymentHandoff, "requiredBeforeProduction"),
      schedulerRuntimeFoundation,
      status: "passed",
      traceIds: {
        contracts: contracts.check.traceId,
        health: health.check.traceId,
      },
      url: server.url,
      workerIdempotencyStoreFoundation,
      workerLeaseStoreFoundation,
      workerSchedulerFoundation,
    };
  } finally {
    await server.stop();
    if (durableEnv.cleanupDir) {
      await rm(durableEnv.cleanupDir, { force: true, recursive: true });
    }
  }

  if (!summaryDraft) {
    throw new Error("Campaign OS backend runtime smoke check did not produce a summary.");
  }

  return {
    ...summaryDraft,
    shutdownState: server.getReadiness().shutdownState.state,
  };
};

if (process.argv.includes("--run")) {
  runBackendRuntimeSmoke()
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch((error: unknown) => {
      console.error("[campaign-os-api-runtime] smoke failed", error);
      process.exitCode = 1;
    });
}
