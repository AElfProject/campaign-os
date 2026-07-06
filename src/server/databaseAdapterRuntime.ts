import type { BackendRuntimeProfileId } from "./backendProfiles";
import { resolveBackendRuntimeProfile } from "./backendProfiles";
import { sanitizeBackendConfigDiagnosticValue } from "./config";
import {
  createDatabaseProviderRegistryReport,
  type DatabaseDriverDescriptor,
  type DatabaseProviderDiagnostic,
  type DatabaseProviderRegistryReport,
} from "./databaseProviderRegistry";
import type { BackendStoreId } from "./persistenceAdapterPort";
import {
  productionDatabaseStoreRegistry,
  type ProductionDatabaseStoreRegistryEntry,
} from "./productionDatabase";
import {
  createProductionDbRuntimeContract,
  type ProductionDbRuntimeContract,
} from "./productionDbRuntime";

export type DatabaseAdapterRuntimeStatus = "active_local" | "boundary_ready" | "blocked";
export type ConnectionPoolState =
  | "not_configured"
  | "configured_redacted"
  | "deferred"
  | "blocked";
export type DatabaseAdapterDiagnosticSeverity = "error" | "warning" | "info";
export type DatabaseAdapterDiagnosticCode =
  | DatabaseProviderDiagnostic["code"]
  | "DATABASE_ADAPTER_CONFIG_REQUIRED"
  | "DATABASE_ADAPTER_SECRET_REDACTED"
  | "DATABASE_ADAPTER_PRECONDITION_DEFERRED"
  | "DATABASE_ADAPTER_PROFILE_UNSUPPORTED";
export type DatabaseAdapterStoreStatus = "mapped" | "deferred" | "blocked";
export type DatabaseQueryCapability = "read" | "write" | "transaction" | "migration_plan";
export type DatabaseTransactionMode = "deterministic_test" | "deferred_live";
export type MigrationExecutorStatus = "not_configured" | "deferred" | "blocked";
export type DatabaseAdapterDeferredDependencyStatus = "deferred" | "blocked";

export interface DatabaseAdapterRuntimeDiagnostic {
  code: DatabaseAdapterDiagnosticCode;
  field: string;
  message: string;
  severity: DatabaseAdapterDiagnosticSeverity;
}

export interface ConnectionPoolSummary {
  configuredKeyCount: number;
  diagnosticCodes: DatabaseAdapterDiagnosticCode[];
  diagnostics: DatabaseAdapterRuntimeDiagnostic[];
  id: string;
  liveConnectionAttempted: false;
  missingKeys: string[];
  redactedFields: string[];
  requiredKeys: string[];
  safeLabel: string;
  state: ConnectionPoolState;
}

export interface DatabaseAdapterRuntimeStore {
  adapterStatus: DatabaseAdapterStoreStatus;
  entities: string[];
  id: BackendStoreId;
  label: string;
  ownerServiceId: string;
  primaryKeys: string[];
  required: boolean;
  schemaVersion: string;
  tableNamespace: string;
}

export interface DatabaseQueryAdapterSummary {
  capabilities: DatabaseQueryCapability[];
  deterministicTestMode: boolean;
  diagnosticCodes: DatabaseAdapterDiagnosticCode[];
  driverId: string;
  id: string;
  liveQueryExecutionEnabled: false;
  supportedStoreIds: BackendStoreId[];
}

export interface DatabaseTransactionSummary {
  eventCaptureSupported: boolean;
  liveCommitEnabled: false;
  mode: DatabaseTransactionMode;
  supported: boolean;
  unitOfWorkId: string;
}

export interface MigrationExecutorPrecondition {
  id: string;
  required: boolean;
  status: "satisfied" | "missing" | "deferred" | "blocked";
}

export interface MigrationExecutorHandoffSummary {
  diagnosticCodes: DatabaseAdapterDiagnosticCode[];
  executorStatus: MigrationExecutorStatus;
  id: string;
  liveExecutionCount: 0;
  liveExecutionEnabled: false;
  preconditions: MigrationExecutorPrecondition[];
}

export interface DatabaseAdapterDeferredDependency {
  blockedBy: string[];
  id: string;
  label: string;
  requiredBeforeProduction: true;
  status: DatabaseAdapterDeferredDependencyStatus;
}

export interface ProductionDatabaseAdapterRuntimeContract {
  connectionPool: ConnectionPoolSummary;
  deferredDependencies: DatabaseAdapterDeferredDependency[];
  diagnostics: DatabaseAdapterRuntimeDiagnostic[];
  driverId: string;
  id: "campaign-os-production-database-adapter-runtime";
  liveConnectionAttempted: false;
  liveQueryExecutionEnabled: false;
  migrationExecutor: MigrationExecutorHandoffSummary;
  profileId: BackendRuntimeProfileId;
  productionDbRuntime: ProductionDbRuntimeReadinessProjection;
  providerId: string;
  queryAdapter: DatabaseQueryAdapterSummary;
  registry: DatabaseProviderRegistryReport;
  status: DatabaseAdapterRuntimeStatus;
  stores: DatabaseAdapterRuntimeStore[];
  transaction: DatabaseTransactionSummary;
  valid: boolean;
}

export interface ProductionDbRuntimeReadinessProjection extends ProductionDbRuntimeContract {
  connectionState: ProductionDbRuntimeContract["connection"]["state"];
  diagnosticCodes: ProductionDbRuntimeContract["diagnostics"][number]["code"][];
  driverProductionReady: boolean;
  migrationGateStatus: ProductionDbRuntimeContract["migrationGate"]["status"];
  ownerStoreCount: number;
}

export interface CreateProductionDatabaseAdapterRuntimeContractOptions {
  driverId?: string;
  env?: Record<string, string | undefined>;
  profileId?: string;
  providerId?: string;
  requestedConnectionLabel?: string;
}

const REDACTED_VALUE = "[redacted]";
const connectionConfigKeys = [
  "CAMPAIGN_OS_DATABASE_URL",
  "CAMPAIGN_OS_DATABASE_PASSWORD",
  "CAMPAIGN_OS_DATABASE_TOKEN",
  "CAMPAIGN_OS_DATABASE_BEARER",
  "CAMPAIGN_OS_DATABASE_PRIVATE_KEY",
  "CAMPAIGN_OS_DATABASE_SIGNED_URL",
  "CAMPAIGN_OS_DATABASE_OBJECT_KEY",
  "CAMPAIGN_OS_DATABASE_MNEMONIC",
  "CAMPAIGN_OS_DATABASE_SIGNATURE",
] as const;

export const databaseAdapterDeferredDependencies: DatabaseAdapterDeferredDependency[] = [
  {
    blockedBy: ["M174 driver package selection"],
    id: "driver-package-selection",
    label: "Driver package selection",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["production DB deployment environment mission"],
    id: "db-deployment-env",
    label: "Database deployment environment",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["schema migration implementation mission"],
    id: "schema-migration-implementation",
    label: "Schema migration implementation",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["connection pool implementation mission"],
    id: "connection-pool-implementation",
    label: "Connection pool implementation",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["migration lock mission"],
    id: "migration-lock",
    label: "Migration lock",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["backup and restore plan mission"],
    id: "backup-restore-plan",
    label: "Backup and restore plan",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["secret manager integration mission"],
    id: "secret-manager",
    label: "Secret manager",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["observability exporter mission"],
    id: "observability-exporter",
    label: "Observability exporter",
    requiredBeforeProduction: true,
    status: "deferred",
  },
];

const hasConfiguredValue = (value: string | undefined): value is string =>
  value !== undefined && value.trim().length > 0;

const diagnostic = (
  code: DatabaseAdapterDiagnosticCode,
  field: string,
  message: string,
  severity: DatabaseAdapterDiagnosticSeverity = "error",
): DatabaseAdapterRuntimeDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const mapRegistryDiagnostic = (
  issue: DatabaseProviderDiagnostic,
): DatabaseAdapterRuntimeDiagnostic => ({
  code: issue.code,
  field: issue.field,
  message: issue.message,
  severity: issue.severity,
});

const missingConfigDiagnostic = (field: string): DatabaseAdapterRuntimeDiagnostic =>
  diagnostic(
    "DATABASE_ADAPTER_CONFIG_REQUIRED",
    field,
    `Required production database adapter config '${field}' is not configured.`,
  );

const secretRedactedDiagnostic = (field: string): DatabaseAdapterRuntimeDiagnostic =>
  diagnostic(
    "DATABASE_ADAPTER_SECRET_REDACTED",
    field,
    `Production database adapter config '${field}' was redacted from readiness metadata.`,
    "info",
  );

const createConnectionPoolSummary = ({
  driver,
  env,
  profileId,
  requestedConnectionLabel,
}: {
  driver?: DatabaseDriverDescriptor;
  env: Record<string, string | undefined>;
  profileId: BackendRuntimeProfileId;
  requestedConnectionLabel?: string;
}): ConnectionPoolSummary => {
  const requiredKeys = driver?.requiredConfigKeys ?? ["CAMPAIGN_OS_DATABASE_URL"];
  const configuredKeys = connectionConfigKeys.filter((key) => hasConfiguredValue(env[key]));
  const missingKeys =
    profileId === "production-required"
      ? requiredKeys.filter((key) => !hasConfiguredValue(env[key]))
      : [];
  const redactedFields = configuredKeys.filter(
    (key) => sanitizeBackendConfigDiagnosticValue(key, env[key]) === REDACTED_VALUE,
  );
  const diagnostics = [
    ...missingKeys.map(missingConfigDiagnostic),
    ...redactedFields.map(secretRedactedDiagnostic),
  ];

  if (requestedConnectionLabel) {
    diagnostics.push(secretRedactedDiagnostic("requestedConnectionLabel"));
  }

  const state: ConnectionPoolState =
    missingKeys.length > 0
      ? "blocked"
      : configuredKeys.length > 0
        ? "configured_redacted"
        : driver?.status === "deferred"
          ? "deferred"
          : "not_configured";

  return {
    configuredKeyCount: configuredKeys.length,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    id: "campaign-os-production-database-connection-pool",
    liveConnectionAttempted: false,
    missingKeys,
    redactedFields,
    requiredKeys: [...requiredKeys],
    safeLabel: configuredKeys.length > 0 || requestedConnectionLabel ? REDACTED_VALUE : "not_configured",
    state,
  };
};

const primaryKeysForStore = (store: ProductionDatabaseStoreRegistryEntry): string[] => {
  if (store.id === "points-ledger") {
    return ["ledgerEntryId"];
  }

  if (store.id === "wallet-session-db") {
    return ["walletAddress", "chainId"];
  }

  return ["id"];
};

const createStoreMappings = ({
  blocked,
  deterministicTestMode,
}: {
  blocked: boolean;
  deterministicTestMode: boolean;
}): DatabaseAdapterRuntimeStore[] =>
  productionDatabaseStoreRegistry.map((store) => ({
    adapterStatus: blocked ? "blocked" : deterministicTestMode ? "mapped" : "deferred",
    entities: [...store.entities],
    id: store.id,
    label: store.label,
    ownerServiceId: store.ownerServiceId,
    primaryKeys: primaryKeysForStore(store),
    required: true,
    schemaVersion: store.schemaVersion,
    tableNamespace: store.id.replace(/-/g, "_"),
  }));

const createQueryAdapterSummary = ({
  driver,
  diagnostics,
  deterministicTestMode,
}: {
  deterministicTestMode: boolean;
  diagnostics: readonly DatabaseAdapterRuntimeDiagnostic[];
  driver?: DatabaseDriverDescriptor;
}): DatabaseQueryAdapterSummary => ({
  capabilities: driver
    ? [
      "read",
      "write",
      ...(driver.supportsTransactions ? ["transaction" as const] : []),
      ...(driver.supportsMigrations ? ["migration_plan" as const] : []),
    ]
    : [],
  deterministicTestMode,
  diagnosticCodes: diagnostics.map((item) => item.code),
  driverId: driver?.id ?? "unresolved",
  id: "campaign-os-database-query-adapter-port",
  liveQueryExecutionEnabled: false,
  supportedStoreIds: driver ? [...driver.supportedStoreIds] : [],
});

const createTransactionSummary = ({
  deterministicTestMode,
  driver,
}: {
  deterministicTestMode: boolean;
  driver?: DatabaseDriverDescriptor;
}): DatabaseTransactionSummary => {
  if (deterministicTestMode) {
    return {
      eventCaptureSupported: true,
      liveCommitEnabled: false,
      mode: "deterministic_test",
      supported: true,
      unitOfWorkId: "campaign-os-deterministic-database-unit-of-work",
    };
  }

  return {
    eventCaptureSupported: false,
    liveCommitEnabled: false,
    mode: "deferred_live",
    supported: Boolean(driver?.supportsTransactions),
    unitOfWorkId: "campaign-os-production-database-unit-of-work-deferred",
  };
};

const createProductionPreconditionDiagnostics = (
  profileId: BackendRuntimeProfileId,
): DatabaseAdapterRuntimeDiagnostic[] =>
  profileId === "production-required"
    ? databaseAdapterDeferredDependencies.map((dependency) =>
      diagnostic(
        "DATABASE_ADAPTER_PRECONDITION_DEFERRED",
        dependency.id,
        `Production database adapter precondition '${dependency.id}' is deferred.`,
      ),
    )
    : [];

const createMigrationExecutorHandoffSummary = ({
  connectionPool,
  diagnostics,
  profileId,
}: {
  connectionPool: ConnectionPoolSummary;
  diagnostics: readonly DatabaseAdapterRuntimeDiagnostic[];
  profileId: BackendRuntimeProfileId;
}): MigrationExecutorHandoffSummary => {
  const required = profileId === "production-required";
  const connectionReady = connectionPool.state === "configured_redacted";
  const preconditions: MigrationExecutorPrecondition[] = [
    {
      id: "driver-package-selected",
      required,
      status: required ? "deferred" : "satisfied",
    },
    {
      id: "connection-pool-ready",
      required,
      status: required ? (connectionReady ? "satisfied" : "missing") : "satisfied",
    },
    {
      id: "migration-lock-ready",
      required,
      status: required ? "deferred" : "satisfied",
    },
    {
      id: "backup-restore-plan-ready",
      required,
      status: required ? "deferred" : "satisfied",
    },
    {
      id: "secret-manager-ready",
      required,
      status: required ? "deferred" : "satisfied",
    },
    {
      id: "explicit-live-migration-approval",
      required,
      status: required ? "missing" : "satisfied",
    },
  ];

  return {
    diagnosticCodes: diagnostics.map((item) => item.code),
    executorStatus: required
      ? "blocked"
      : connectionPool.state === "configured_redacted"
        ? "deferred"
        : "not_configured",
    id: "campaign-os-migration-executor-handoff",
    liveExecutionCount: 0,
    liveExecutionEnabled: false,
    preconditions,
  };
};

const createProductionDbRuntimeReadinessProjection = (
  contract: ProductionDbRuntimeContract,
): ProductionDbRuntimeReadinessProjection => ({
  ...contract,
  connectionState: contract.connection.state,
  diagnosticCodes: contract.diagnostics.map((item) => item.code),
  driverProductionReady: contract.driver.productionReady,
  migrationGateStatus: contract.migrationGate.status,
  ownerStoreCount: contract.ownerStores.length,
});

const resolveRuntimeStatus = ({
  deterministicTestMode,
  diagnostics,
}: {
  deterministicTestMode: boolean;
  diagnostics: readonly DatabaseAdapterRuntimeDiagnostic[];
}): DatabaseAdapterRuntimeStatus => {
  if (diagnostics.some((item) => item.severity === "error")) {
    return "blocked";
  }

  return deterministicTestMode ? "active_local" : "boundary_ready";
};

export const createProductionDatabaseAdapterRuntimeContract = ({
  driverId,
  env = typeof process === "undefined" ? {} : process.env,
  profileId,
  providerId,
  requestedConnectionLabel,
}: CreateProductionDatabaseAdapterRuntimeContractOptions = {}): ProductionDatabaseAdapterRuntimeContract => {
  const profileResolution = resolveBackendRuntimeProfile(
    profileId ?? env.CAMPAIGN_OS_BACKEND_PROFILE,
  );
  const registry = createDatabaseProviderRegistryReport({
    driverId: driverId ?? env.CAMPAIGN_OS_DATABASE_DRIVER,
    profileId: profileResolution.profile.id,
    providerId: providerId ?? env.CAMPAIGN_OS_DATABASE_PROVIDER,
  });
  const connectionPool = createConnectionPoolSummary({
    driver: registry.activeDriver,
    env,
    profileId: profileResolution.profile.id,
    requestedConnectionLabel,
  });
  const productionDbRuntime = createProductionDbRuntimeReadinessProjection(
    createProductionDbRuntimeContract({
      driverId: driverId ?? env.CAMPAIGN_OS_DATABASE_DRIVER,
      env,
      profileId: profileId ?? env.CAMPAIGN_OS_BACKEND_PROFILE,
      providerId: providerId ?? env.CAMPAIGN_OS_DATABASE_PROVIDER,
    }),
  );
  const deterministicTestMode = registry.activeProvider?.kind === "deterministic_test";
  const diagnostics: DatabaseAdapterRuntimeDiagnostic[] = [
    ...profileResolution.diagnostics.map((item) =>
      diagnostic(
        "DATABASE_ADAPTER_PROFILE_UNSUPPORTED",
        item.field,
        item.message,
        item.severity,
      ),
    ),
    ...registry.validation.issues.map(mapRegistryDiagnostic),
    ...connectionPool.diagnostics,
    ...createProductionPreconditionDiagnostics(profileResolution.profile.id),
  ];
  const blocked = diagnostics.some((item) => item.severity === "error");
  const queryAdapter = createQueryAdapterSummary({
    deterministicTestMode,
    diagnostics,
    driver: registry.activeDriver,
  });

  return {
    connectionPool,
    deferredDependencies: databaseAdapterDeferredDependencies,
    diagnostics,
    driverId: registry.selectedDriverId,
    id: "campaign-os-production-database-adapter-runtime",
    liveConnectionAttempted: false,
    liveQueryExecutionEnabled: false,
    migrationExecutor: createMigrationExecutorHandoffSummary({
      connectionPool,
      diagnostics,
      profileId: profileResolution.profile.id,
    }),
    profileId: profileResolution.profile.id,
    productionDbRuntime,
    providerId: registry.selectedProviderId,
    queryAdapter,
    registry,
    status: resolveRuntimeStatus({ deterministicTestMode, diagnostics }),
    stores: createStoreMappings({ blocked, deterministicTestMode }),
    transaction: createTransactionSummary({
      deterministicTestMode,
      driver: registry.activeDriver,
    }),
    valid: !blocked && profileResolution.valid,
  };
};
