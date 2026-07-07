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
  persistenceFoundation?: BackendRuntimeSmokePersistenceFoundationSummary;
  providerIndexerFoundation?: BackendRuntimeSmokeProviderIndexerFoundationSummary;
  queueRuntimeFoundation?: BackendRuntimeSmokeQueueRuntimeFoundationSummary;
  schedulerRuntimeFoundation?: BackendRuntimeSmokeSchedulerRuntimeFoundationSummary;
  status: number;
  traceId: string;
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
  queuePlanCount: number;
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

export interface BackendRuntimeSmokeSummary {
  activationId?: string;
  authSessionFoundation: BackendRuntimeSmokeAuthSessionFoundationSummary;
  checks: {
    contracts: BackendRuntimeSmokeCheck;
    health: BackendRuntimeSmokeCheck;
  };
  host: string;
  liveSideEffectsEnabled: boolean;
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
    queuePlanCount: getNumber(record, "queuePlanCount"),
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

  return {
    activation,
    check: {
      activationPresent: Boolean(activation),
      authSessionFoundation,
      deploymentHandoff,
      endpoint,
      ok: payload.ok === true && payload.traceId === traceId,
      persistenceFoundation,
      providerIndexerFoundation,
      queueRuntimeFoundation,
      schedulerRuntimeFoundation,
      status: response.status,
      traceId: payload.traceId ?? "",
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
    const workerSchedulerFoundation = contracts.check.workerSchedulerFoundation;

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
