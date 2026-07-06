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
  type AuthSessionReadinessReport,
} from "./authSession";
import {
  resolveApiServerRuntimeContract,
  type ResolveApiServerRuntimeContractOptions,
} from "./serverRuntime";

export type BackendAttachPointArea =
  | "production-persistence"
  | "auth-session"
  | "provider-adapters"
  | "worker-queue"
  | "scheduler"
  | "contract-writer"
  | "object-storage-export"
  | "reward-custody"
  | "reward-distribution"
  | "analytics-warehouse";
export type BackendAttachPointStatus = "local-only" | "scaffold" | "deferred" | "blocked";
export type BackendReadinessDiagnosticCode =
  | "AUTH_SESSION_READINESS_BLOCKED"
  | "BACKEND_CONFIG_BLOCKED"
  | "DATABASE_READINESS_BLOCKED"
  | "PERSISTENCE_ADAPTER_INVALID"
  | "MIGRATION_MANIFEST_INVALID"
  | "API_FOUNDATION_INVALID"
  | "TOPOLOGY_INVALID"
  | "SERVICE_PORTS_INVALID"
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

export interface BackendServiceReadinessReport {
  apiFoundation: {
    coverage: ApiFoundationReport["coverage"];
    servicePorts: ApiServicePortReport;
    validation: ApiFoundationReport["validation"];
  };
  attachMap: BackendAttachPoint[];
  authSession: AuthSessionReadinessReport;
  backendRuntimeBootstrap: BackendRuntimeBootstrapContract;
  config: BackendConfigContract;
  databaseAdapterRuntime: BackendDatabaseAdapterRuntimeReadinessReport;
  databaseReadiness: BackendDatabaseReadinessReport;
  entrypoint: BackendServiceEntrypoint;
  migration: MigrationManifest;
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
  providerId: string;
  queryAdapter: DatabaseQueryAdapterSummary;
  requiredStoreCount: number;
  status: DatabaseAdapterRuntimeStatus;
  stores: DatabaseAdapterRuntimeStore[];
  transaction: DatabaseTransactionSummary;
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

export interface BackendDatabaseReadinessReport {
  adapter: ProductionDatabaseAdapterContract;
  migrationPlan: MigrationRunnerPlan;
  stores: ProductionDatabaseStoreRegistryEntry[];
  validation: {
    issues: Array<ProductionDatabaseDiagnostic | MigrationRunnerPlan["diagnostics"][number]>;
    valid: boolean;
  };
}

export interface CreateBackendServiceReadinessReportOptions {
  configOptions?: BackendConfigContractOptions;
  generatedAt?: string;
  serverRuntimeOptions?: Partial<ResolveApiServerRuntimeContractOptions>;
}

const requiredAttachPointAreas: BackendAttachPointArea[] = [
  "production-persistence",
  "auth-session",
  "provider-adapters",
  "worker-queue",
  "scheduler",
  "contract-writer",
  "object-storage-export",
  "reward-custody",
  "reward-distribution",
  "analytics-warehouse",
];

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
      "JWT or session cookie issuer",
      "RBAC enforcement",
      "project ownership source",
      "admin organization model",
      "agent credential provider",
    ],
    currentStatus: "scaffold",
    note: "Mission 170 exposes auth/session contract readiness only; live enforcement is still deferred.",
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
    area: "scheduler",
    attachPoint: "src/server/backendService.ts",
    blockedBy: ["scheduler runtime mission", "retry/backoff policy"],
    currentStatus: "deferred",
    note: "No cron, delayed job, or scheduled campaign processor runs in this scaffold.",
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

const createValidationIssues = ({
  apiFoundation,
  attachMap,
  authSession,
  config,
  databaseAdapterRuntime,
  databaseReadiness,
  entrypoint,
  migration,
  persistenceAdapters,
  persistenceRuntime,
  servicePorts,
  topology,
}: {
  apiFoundation: ApiFoundationReport;
  attachMap: readonly BackendAttachPoint[];
  authSession: AuthSessionReadinessReport;
  config: BackendConfigContract;
  databaseAdapterRuntime: BackendDatabaseAdapterRuntimeReadinessReport;
  databaseReadiness: BackendDatabaseReadinessReport;
  entrypoint: BackendServiceEntrypoint;
  migration: MigrationManifest;
  persistenceAdapters: PersistenceAdapterPortReport;
  persistenceRuntime: BackendPersistenceRuntimeReadinessReport;
  servicePorts: ApiServicePortReport;
  topology: BackendTopologyReport;
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
  providerId: runtime.providerId,
  queryAdapter: runtime.queryAdapter,
  requiredStoreCount: runtime.stores.filter((store) => store.required).length,
  status: runtime.status,
  stores: runtime.stores,
  transaction: runtime.transaction,
  valid: runtime.valid && runtime.migrationHandoff.valid,
});

export const createBackendServiceReadinessReport = ({
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
    config,
    databaseAdapterRuntime,
    databaseReadiness,
    entrypoint,
    migration,
    persistenceAdapters,
    persistenceRuntime,
    servicePorts,
    topology,
  });
  const readinessWithoutBootstrap = {
    apiFoundation: {
      coverage: apiFoundation.coverage,
      servicePorts,
      validation: apiFoundation.validation,
    },
    attachMap: backendAttachMap,
    authSession,
    config,
    databaseAdapterRuntime,
    databaseReadiness,
    entrypoint,
    migration,
    persistenceRuntime,
    persistenceAdapters,
    profile: config.profile,
    topology: {
      coverage: topology.coverage,
      profileReadiness: topology.profileReadiness,
      validation: topology.validation,
    },
    validation: {
      issues: validationIssues,
      valid: validationIssues.length === 0,
    },
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
    backendRuntimeBootstrap,
  };
};
