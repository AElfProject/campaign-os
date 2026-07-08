import { startCampaignOsApiServer } from "./server";

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
  authSessionFoundation?: BackendRuntimeSmokeAuthSessionFoundationSummary;
  deploymentHandoff?: unknown;
  endpoint: "/api/health" | "/api/contracts";
  ok: boolean;
  observabilityExporterFoundation?: BackendRuntimeSmokeObservabilityExporterFoundationSummary;
  persistenceFoundation?: BackendRuntimeSmokePersistenceFoundationSummary;
  providerIndexerFoundation?: BackendRuntimeSmokeProviderIndexerFoundationSummary;
  queueRuntimeFoundation?: BackendRuntimeSmokeQueueRuntimeFoundationSummary;
  schedulerRuntimeFoundation?: BackendRuntimeSmokeSchedulerRuntimeFoundationSummary;
  status: number;
  traceId: string;
  workerIdempotencyStoreFoundation?: BackendRuntimeSmokeWorkerIdempotencyStoreFoundationSummary;
  workerLeaseStoreFoundation?: BackendRuntimeSmokeWorkerLeaseStoreFoundationSummary;
  workerSchedulerFoundation?: BackendRuntimeSmokeWorkerSchedulerFoundationSummary;
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
  liveQueuePublishingEnabled: false;
  liveSchedulerExecutionEnabled: false;
  liveWorkerExecutionEnabled: false;
  productionReady: false;
  providerAdapter: BackendRuntimeSmokeQueueProviderAdapterSummary;
  queuePlanCount: number;
  status?: string;
  valid: boolean;
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
  driverLiveQueuePublishingEnabled: false;
  driverLiveWorkerExecutionEnabled: false;
  driverMode?: string;
  driverOperationCount: number;
  driverProductionReady: false;
  driverProviderId?: string;
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
  driverSdkBindingPackageBindingBlockerCount: number;
  driverSdkBindingPackageBindingBrowserBundleAllowed: false;
  driverSdkBindingPackageBindingDiagnosticCodes: string[];
  driverSdkBindingPackageBindingFamily?: string;
  driverSdkBindingPackageBindingId?: string;
  driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false;
  driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false;
  driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false;
  driverSdkBindingPackageBindingPackageName?: string;
  driverSdkBindingPackageBindingPackageRef?: string;
  driverSdkBindingPackageBindingSdkClientConstructed: false;
  driverSdkBindingPackageBindingStatus?: string;
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

export interface BackendRuntimeSmokeSummary {
  activationId?: string;
  authSessionFoundation: BackendRuntimeSmokeAuthSessionFoundationSummary;
  checks: {
    contracts: BackendRuntimeSmokeCheck;
    health: BackendRuntimeSmokeCheck;
  };
  host: string;
  liveSideEffectsEnabled: boolean;
  observabilityExporterFoundation: BackendRuntimeSmokeObservabilityExporterFoundationSummary;
  persistenceFoundation: BackendRuntimeSmokePersistenceFoundationSummary;
  port: number;
  productionReady: boolean;
  providerIndexerFoundation: BackendRuntimeSmokeProviderIndexerFoundationSummary;
  queueRuntimeFoundation: BackendRuntimeSmokeQueueRuntimeFoundationSummary;
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

const getNumber = (
  record: Record<string, unknown> | undefined,
  key: string,
): number => typeof record?.[key] === "number" ? record[key] : 0;

const getString = (
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined => typeof record?.[key] === "string" ? record[key] : undefined;

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

  const noLiveFlags = readNestedRecord(record, ["noLiveFlags"]);
  const explicitNoLive =
    isExplicitFalse(record, "productionReady")
    && isExplicitFalse(record, "liveQueuePublishingEnabled")
    && isExplicitFalse(noLiveFlags, "liveCronExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveQueuePublishingEnabled")
    && isExplicitFalse(noLiveFlags, "liveSchedulerExecutionEnabled")
    && isExplicitFalse(noLiveFlags, "liveWorkerExecutionEnabled");

  if (!explicitNoLive) {
    return undefined;
  }

  const providerAdapter = summarizeQueueProviderAdapter(
    readNestedRecord(record, ["providerAdapter"]),
  );

  if (!providerAdapter) {
    return undefined;
  }

  return {
    blockerCount: getNumber(record, "blockerCount"),
    diagnosticCodes: getStringArray(record, "diagnosticCodes"),
    dryRunEnqueueEnabled: getBoolean(record, "dryRunEnqueueEnabled"),
    id: getString(record, "id"),
    liveCronExecutionEnabled: false,
    liveQueuePublishingEnabled: false,
    liveSchedulerExecutionEnabled: false,
    liveWorkerExecutionEnabled: false,
    productionReady: false,
    providerAdapter,
    queuePlanCount: getNumber(record, "queuePlanCount"),
    status: getString(record, "status"),
    valid: getBoolean(record, "valid"),
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
    && isExplicitFalse(record, "driverLiveQueuePublishingEnabled")
    && isExplicitFalse(record, "driverLiveWorkerExecutionEnabled")
    && isExplicitFalse(record, "driverSdkBindingProductionReady")
    && isExplicitFalse(record, "driverSdkBindingSdkClientConstructed")
    && isExplicitFalse(record, "driverSdkBindingLiveProviderCallAttempted")
    && isExplicitFalse(record, "driverSdkBindingLiveQueuePublishingEnabled")
    && isExplicitFalse(record, "driverSdkBindingLiveWorkerExecutionEnabled")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingBrowserBundleAllowed")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveBrokerConnectionAttempted")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveQueuePublishingEnabled")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingLiveWorkerExecutionEnabled")
    && isExplicitFalse(record, "driverSdkBindingPackageBindingSdkClientConstructed")
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
    driverLiveQueuePublishingEnabled: false,
    driverLiveWorkerExecutionEnabled: false,
    driverMode: getString(record, "driverMode"),
    driverOperationCount: getNumber(record, "driverOperationCount"),
    driverProductionReady: false,
    driverProviderId: getString(record, "driverProviderId"),
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
    driverSdkBindingPackageBindingBlockerCount: getNumber(record, "driverSdkBindingPackageBindingBlockerCount"),
    driverSdkBindingPackageBindingBrowserBundleAllowed: false,
    driverSdkBindingPackageBindingDiagnosticCodes: getStringArray(record, "driverSdkBindingPackageBindingDiagnosticCodes"),
    driverSdkBindingPackageBindingFamily: getString(record, "driverSdkBindingPackageBindingFamily"),
    driverSdkBindingPackageBindingId: getString(record, "driverSdkBindingPackageBindingId"),
    driverSdkBindingPackageBindingLiveBrokerConnectionAttempted: false,
    driverSdkBindingPackageBindingLiveQueuePublishingEnabled: false,
    driverSdkBindingPackageBindingLiveWorkerExecutionEnabled: false,
    driverSdkBindingPackageBindingPackageName: getString(record, "driverSdkBindingPackageBindingPackageName"),
    driverSdkBindingPackageBindingPackageRef: getString(record, "driverSdkBindingPackageBindingPackageRef"),
    driverSdkBindingPackageBindingSdkClientConstructed: false,
    driverSdkBindingPackageBindingStatus: getString(record, "driverSdkBindingPackageBindingStatus"),
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

  return {
    activation,
    check: {
      activationPresent: Boolean(activation),
      authSessionFoundation,
      deploymentHandoff,
      endpoint,
      ok: payload.ok === true && payload.traceId === traceId,
      observabilityExporterFoundation,
      persistenceFoundation,
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
    && summary.liveQueuePublishingEnabled === false
    && summary.liveWorkerExecutionEnabled === false
    && summary.liveSchedulerExecutionEnabled === false
    && summary.liveCronExecutionEnabled === false
    && summary.queuePlanCount >= 9
    && summary.dryRunEnqueueEnabled === true
    && isQueueProviderAdapterSmokeReady(summary.providerAdapter)
    && summary.status === "local_ready"
    && summary.valid === true;
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
    && summary.driverLiveQueuePublishingEnabled === false
    && summary.driverLiveWorkerExecutionEnabled === false
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
    && summary.driverSdkBindingPackageBindingBrowserBundleAllowed === false
    && summary.driverSdkBindingPackageBindingLiveBrokerConnectionAttempted === false
    && summary.driverSdkBindingPackageBindingLiveQueuePublishingEnabled === false
    && summary.driverSdkBindingPackageBindingLiveWorkerExecutionEnabled === false
    && summary.driverSdkBindingPackageBindingSdkClientConstructed === false
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

export const runBackendRuntimeSmoke = async ({
  env,
  fetchImpl = fetch,
  host = "127.0.0.1",
  logger = false,
  port = 0,
  shutdownTimeoutMs,
}: BackendRuntimeSmokeOptions = {}): Promise<BackendRuntimeSmokeSummary> => {
  const server = await startCampaignOsApiServer({
    env,
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
    const queueRuntimeFoundation = contracts.check.queueRuntimeFoundation;
    const schedulerRuntimeFoundation = contracts.check.schedulerRuntimeFoundation;
    const workerIdempotencyStoreFoundation = contracts.check.workerIdempotencyStoreFoundation;
    const workerLeaseStoreFoundation = contracts.check.workerLeaseStoreFoundation;
    const workerSchedulerFoundation = contracts.check.workerSchedulerFoundation;
    const observabilityExporterFoundation = contracts.check.observabilityExporterFoundation;

    if (
      health.check.status !== 200
      || contracts.check.status !== 200
      || !health.check.ok
      || !contracts.check.ok
      || !health.check.activationPresent
      || !contracts.check.activationPresent
      || !isExplicitFalse(activation, "productionReady")
      || !isExplicitFalse(activation, "liveSideEffectsEnabled")
      || !isAuthSessionFoundationSmokeReady(health.check.authSessionFoundation)
      || !isAuthSessionFoundationSmokeReady(authSessionFoundation)
      || !isPersistenceFoundationSmokeReady(health.check.persistenceFoundation)
      || !isPersistenceFoundationSmokeReady(persistenceFoundation)
      || !isProviderIndexerFoundationSmokeReady(health.check.providerIndexerFoundation)
      || !isProviderIndexerFoundationSmokeReady(providerIndexerFoundation)
      || !isQueueRuntimeFoundationSmokeReady(health.check.queueRuntimeFoundation)
      || !isQueueRuntimeFoundationSmokeReady(queueRuntimeFoundation)
      || !isSchedulerRuntimeFoundationSmokeReady(health.check.schedulerRuntimeFoundation)
      || !isSchedulerRuntimeFoundationSmokeReady(schedulerRuntimeFoundation)
      || !isObservabilityExporterFoundationSmokeReady(health.check.observabilityExporterFoundation)
      || !isObservabilityExporterFoundationSmokeReady(observabilityExporterFoundation)
      || !isWorkerIdempotencyStoreFoundationSmokeReady(health.check.workerIdempotencyStoreFoundation)
      || !isWorkerIdempotencyStoreFoundationSmokeReady(workerIdempotencyStoreFoundation)
      || !isWorkerLeaseStoreFoundationSmokeReady(health.check.workerLeaseStoreFoundation)
      || !isWorkerLeaseStoreFoundationSmokeReady(workerLeaseStoreFoundation)
      || !isWorkerSchedulerFoundationSmokeReady(health.check.workerSchedulerFoundation)
      || !isWorkerSchedulerFoundationSmokeReady(workerSchedulerFoundation)
    ) {
      throw new Error("Campaign OS backend runtime smoke check failed.");
    }

    summaryDraft = {
      activationId: typeof activation?.id === "string" ? activation.id : undefined,
      authSessionFoundation,
      checks: {
        contracts: contracts.check,
        health: health.check,
      },
      host,
      liveSideEffectsEnabled: getBoolean(activation, "liveSideEffectsEnabled"),
      observabilityExporterFoundation,
      persistenceFoundation,
      port: new URL(server.url).port ? Number(new URL(server.url).port) : 0,
      productionReady: getBoolean(activation, "productionReady"),
      providerIndexerFoundation,
      queueRuntimeFoundation,
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
