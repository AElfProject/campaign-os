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
  type AuthSessionReadinessReport,
} from "./authSession";
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
  | "CAMPAIGN_DB_VERTICAL_SLICE_BLOCKED"
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

export type BackendApiServiceBootstrapStatus = "ready" | "blocked" | "deferred";

export interface BackendApiServiceBootstrapSummary {
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
  backendRuntimeBootstrap: BackendRuntimeBootstrapContract;
  campaignDbVerticalSlice: CampaignDbVerticalSliceReadinessSummary;
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

export type BackendAuthEnforcementMode = "blocked" | "local_enforced" | "metadata_only";

export interface BackendAuthEnforcementReadinessSummary {
  agentCredentialSubstitutionDisabled: boolean;
  campaignMutationRouteCount: number;
  localEnforcedRouteCount: number;
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
  "scheduler",
  "contract-writer",
  "object-storage-export",
  "reward-custody",
  "reward-distribution",
  "analytics-warehouse",
];

const apiServiceBlockedDependencyIds = [
  "live-database-driver",
  "migration-executor",
  "wallet-proof-verifier",
  "session-issuer",
  "project-membership-store",
  "contract-writer",
  "reward-custody",
  "reward-distribution",
] as const;

const apiServiceDeferredDependencyIds = [
  "verification-worker",
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
    localEnforcedRouteCount: locallyEnforcedRoutes.length,
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
  persistenceAdapters,
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
  backendRuntimeBootstrap,
  config,
  validationIssues,
}: {
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
  const authEnforcement = createBackendAuthEnforcementReadinessSummary(authSession);
  const campaignDbVerticalSlice = createCampaignDbVerticalSliceReadinessSummary({
    campaignStore,
    config,
    databaseAdapterRuntime,
    migration,
    persistenceRuntime,
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
    authEnforcement,
    authSession,
    campaignDbVerticalSlice,
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
    apiService: createApiServiceBootstrapSummary({
      backendRuntimeBootstrap,
      config,
      validationIssues,
    }),
    backendRuntimeBootstrap,
  };
};
