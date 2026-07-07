import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createDatabaseQueryAdapterSummary,
  type DatabaseQueryAdapterSummary,
} from "./databaseQueryAdapterPort";
import {
  resolveBackendConfigContract,
  sanitizeBackendConfigDiagnosticValue,
  type BackendConfigContractOptions,
} from "./config";
import {
  createDatabaseProviderRegistryReport,
  type DatabaseDriverCapabilityDescriptor,
} from "./databaseProviderRegistry";
import {
  createPersistenceDriverRegistryReport,
  type PersistenceDriverSideEffectPolicy,
  type PersistenceDriverStatus,
} from "./persistenceDriverRegistry";
import {
  createProductionDatabaseSchemaManifest,
  productionDatabaseStoreRegistry,
  type ProductionDatabaseSchemaManifest,
  type ProductionDatabaseStoreOperationCapability,
  type ProductionDatabaseStoreRegistryEntry,
  type ProductionDatabaseStoreReadiness,
} from "./productionDatabase";

export type ProductionPersistenceRuntimeStatus =
  | "active_local"
  | "boundary_ready"
  | "dry_run_ready"
  | "blocked";
export type ProductionPersistenceAdapterKind =
  | "memory"
  | "local_json"
  | "deterministic_test"
  | "production_deferred";
export type ConnectionConfigState =
  | "not_configured"
  | "configured_redacted"
  | "invalid"
  | "deferred";
export type TransactionCapabilityMode = "none" | "deterministic_test" | "deferred_live";
export type ProductionPersistenceDiagnosticSeverity = "error" | "warning" | "info";
export type ProductionPersistenceDiagnosticCode =
  | "PRODUCTION_PERSISTENCE_CONFIG_REQUIRED"
  | "PRODUCTION_PERSISTENCE_DRIVER_UNSUPPORTED"
  | "PRODUCTION_PERSISTENCE_SECRET_REDACTED"
  | "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED";

export interface ProductionPersistenceRuntimeDiagnostic {
  code: ProductionPersistenceDiagnosticCode;
  field: string;
  message: string;
  severity: ProductionPersistenceDiagnosticSeverity;
}

export interface ConnectionConfigSummary {
  configuredKeys: string[];
  diagnostics: ProductionPersistenceRuntimeDiagnostic[];
  missingKeys: string[];
  redactedFields: string[];
  requiredKeys: string[];
  safeLabel: string;
  state: ConnectionConfigState;
}

export interface ProductionPersistenceStoreCoverage {
  entities: string[];
  id: string;
  label: string;
  migrationRequired: boolean;
  operationCapability: ProductionDatabaseStoreOperationCapability;
  ownerServiceId: string;
  readiness: ProductionDatabaseStoreReadiness;
  required: boolean;
  runtimeState: "covered" | "deferred" | "blocked";
  schemaVersion: string;
}

export interface TransactionCapabilitySummary {
  mode: TransactionCapabilityMode;
  supported: boolean;
  unitOfWorkId: string;
}

export interface DeferredPersistenceDependency {
  blockedBy: string[];
  id: string;
  label: string;
  requiredBeforeProduction: boolean;
  status: "planned" | "deferred" | "blocked";
}

export interface ProductionPersistenceProviderSummary {
  driverIds: string[];
  id: string;
  label: string;
  requiresNetwork: boolean;
  requiresSecretManager: boolean;
  status: "available" | "deferred" | "blocked";
}

export interface ProductionPersistenceDriverSummary {
  capabilities: {
    pooling?: boolean;
    requiresNetwork?: boolean;
    requiresSecretManager?: boolean;
    sideEffectPolicy?: PersistenceDriverSideEffectPolicy;
    supportsConnectionPool?: boolean;
    supportsMigrations?: boolean;
    supportsReset?: boolean;
    supportsTransactions: boolean;
    transactions?: boolean;
  };
  deferredBlockers: string[];
  id: string;
  kind?: ProductionPersistenceAdapterKind;
  label: string;
  providerId?: string;
  requiredConfigKeys: string[];
  status: PersistenceDriverStatus | "available" | "deferred" | "blocked";
  supportedStoreIds: string[];
}

export interface ProductionPersistenceProviderDecision {
  diagnostics: ProductionPersistenceRuntimeDiagnostic[];
  drivers: ProductionPersistenceDriverSummary[];
  providers: ProductionPersistenceProviderSummary[];
  selectedDriverId: string;
  selectedProviderId: string;
  status: "local-review" | "blocked";
  valid: boolean;
}

export interface ProductionPersistenceDriverDecision {
  activeDriverId: string;
  adapterKind: ProductionPersistenceAdapterKind;
  diagnostics: ProductionPersistenceRuntimeDiagnostic[];
  drivers: ProductionPersistenceDriverSummary[];
  status: PersistenceDriverStatus | "unknown";
  valid: boolean;
}

export interface ProductionPersistenceRuntimeContract {
  activeDriverId: string;
  adapterKind: ProductionPersistenceAdapterKind;
  connection: ConnectionConfigSummary;
  deferredDependencies: DeferredPersistenceDependency[];
  diagnostics: ProductionPersistenceRuntimeDiagnostic[];
  driverDecision: ProductionPersistenceDriverDecision;
  foundationId: typeof productionPersistenceFoundationId;
  id: "campaign-os-production-persistence-runtime";
  liveConnectionAttempted: false;
  profileId: BackendRuntimeProfileId;
  productionBlockers: DeferredPersistenceDependency[];
  productionReady: false;
  providerDecision: ProductionPersistenceProviderDecision;
  queryCapability: Pick<
    DatabaseQueryAdapterSummary,
    | "adHocRawSqlEnabled"
    | "liveQueryExecutionEnabled"
    | "parameterizedQueries"
    | "repositoryContractCount"
  > & {
    transactionMode: TransactionCapabilityMode;
  };
  requestedDriverId?: string;
  schemaManifest: ProductionDatabaseSchemaManifest;
  schemaVersion: "v0.2.0";
  status: ProductionPersistenceRuntimeStatus;
  stores: ProductionPersistenceStoreCoverage[];
  supportMode: string;
  transaction: TransactionCapabilitySummary;
  valid: boolean;
}

export interface CreateConnectionConfigSummaryOptions {
  env?: Record<string, string | undefined>;
  profileId?: BackendRuntimeProfileId;
  requiredKeys?: readonly string[];
}

export interface CreateProductionPersistenceRuntimeContractOptions
  extends BackendConfigContractOptions {
  requestedDriverId?: string;
}

const REDACTED_VALUE = "[redacted]";
const notConfiguredLabel = "not_configured";
export const productionPersistenceFoundationId =
  "campaign-os-production-persistence-foundation-v0.2" as const;
const productionConnectionConfigKeys = [
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

const supportedDriverIds = [
  "campaign-os-memory-adapter",
  "campaign-os-local-json-adapter",
  "campaign-os-deterministic-test-adapter",
  "campaign-os-production-db-adapter",
] as const;

const createStoreCoverage = (
  store: ProductionDatabaseStoreRegistryEntry,
): ProductionPersistenceStoreCoverage => {
  if (!store.operationCapability) {
    throw new Error(`Production persistence store '${store.id}' is missing operation capability.`);
  }

  return {
    entities: [...store.entities],
    id: store.id,
    label: store.label,
    migrationRequired: store.migrationRequired,
    operationCapability: {
      ...store.operationCapability,
      operations: [...store.operationCapability.operations],
    },
    ownerServiceId: store.ownerServiceId,
    readiness: store.readiness,
    required: true,
    runtimeState: "covered",
    schemaVersion: store.schemaVersion,
  };
};

const requiredStoreCoverages: ProductionPersistenceStoreCoverage[] =
  productionDatabaseStoreRegistry.map(createStoreCoverage);

export const productionPersistenceDeferredDependencies: DeferredPersistenceDependency[] = [
  {
    blockedBy: ["database provider selection mission"],
    id: "db-provider-selection",
    label: "DB provider selection",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["driver package approval mission"],
    id: "driver-package",
    label: "Driver package",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["connection config mission"],
    id: "connection-config",
    label: "Connection config",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["connection pooling mission"],
    id: "connection-pool",
    label: "Connection pool",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["protected migration executor mission"],
    id: "migration-executor",
    label: "Migration executor",
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
    blockedBy: ["backup and restore runbook mission"],
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
  {
    blockedBy: ["analytics warehouse adapter mission"],
    id: "analytics-warehouse",
    label: "Analytics warehouse",
    requiredBeforeProduction: true,
    status: "deferred",
  },
  {
    blockedBy: ["object storage export adapter mission"],
    id: "object-storage-export",
    label: "Object storage export",
    requiredBeforeProduction: true,
    status: "deferred",
  },
];

const isSupportedDriverId = (value: string): value is (typeof supportedDriverIds)[number] =>
  supportedDriverIds.some((driverId) => driverId === value);

const hasConfiguredValue = (value: string | undefined): value is string =>
  value !== undefined && value.trim().length > 0;

const missingRequiredKeys = (
  env: Record<string, string | undefined>,
  requiredKeys: readonly string[],
): string[] => requiredKeys.filter((key) => !hasConfiguredValue(env[key]));

const secretRedactedDiagnostic = (field: string): ProductionPersistenceRuntimeDiagnostic => ({
  code: "PRODUCTION_PERSISTENCE_SECRET_REDACTED",
  field,
  message: `Production persistence config '${field}' was redacted from readiness diagnostics.`,
  severity: "info",
});

const missingConfigDiagnostic = (field: string): ProductionPersistenceRuntimeDiagnostic => ({
  code: "PRODUCTION_PERSISTENCE_CONFIG_REQUIRED",
  field,
  message: `Required production persistence config '${field}' is not configured.`,
  severity: "error",
});

const unsupportedDriverDiagnostic = (value: string): ProductionPersistenceRuntimeDiagnostic => ({
  code: "PRODUCTION_PERSISTENCE_DRIVER_UNSUPPORTED",
  field: "CAMPAIGN_OS_PERSISTENCE_DRIVER",
  message: `Unsupported production persistence driver: ${
    isSupportedDriverId(value) ? value : REDACTED_VALUE
  }.`,
  severity: "error",
});

export const createConnectionConfigSummary = ({
  env = typeof process === "undefined" ? {} : process.env,
  profileId = "local-review",
  requiredKeys = ["CAMPAIGN_OS_DATABASE_URL"],
}: CreateConnectionConfigSummaryOptions = {}): ConnectionConfigSummary => {
  const configuredKeys = productionConnectionConfigKeys.filter((key) => hasConfiguredValue(env[key]));
  const missingKeys = profileId === "production-required"
    ? missingRequiredKeys(env, requiredKeys)
    : [];
  const redactedFields = configuredKeys.filter((key) =>
    sanitizeBackendConfigDiagnosticValue(key, env[key]) === REDACTED_VALUE,
  );
  const diagnostics = [
    ...missingKeys.map(missingConfigDiagnostic),
    ...redactedFields.map(secretRedactedDiagnostic),
  ];
  const state: ConnectionConfigState =
    configuredKeys.length > 0 ? "configured_redacted" : missingKeys.length > 0 ? "invalid" : "not_configured";

  return {
    configuredKeys,
    diagnostics,
    missingKeys,
    redactedFields,
    requiredKeys: [...requiredKeys],
    safeLabel: configuredKeys.length > 0 ? REDACTED_VALUE : notConfiguredLabel,
    state,
  };
};

const resolveDriver = ({
  requestedDriverId,
  persistenceMode,
  profileId,
}: {
  persistenceMode: "memory" | "local_json";
  profileId: BackendRuntimeProfileId;
  requestedDriverId?: string;
}): {
  activeDriverId: string;
  adapterKind: ProductionPersistenceAdapterKind;
  diagnostics: ProductionPersistenceRuntimeDiagnostic[];
} => {
  if (requestedDriverId && !isSupportedDriverId(requestedDriverId)) {
    return {
      activeDriverId: "campaign-os-memory-adapter",
      adapterKind: "memory",
      diagnostics: [unsupportedDriverDiagnostic(requestedDriverId)],
    };
  }

  if (requestedDriverId === "campaign-os-deterministic-test-adapter") {
    return {
      activeDriverId: requestedDriverId,
      adapterKind: "deterministic_test",
      diagnostics: [],
    };
  }

  if (profileId === "production-required" || requestedDriverId === "campaign-os-production-db-adapter") {
    return {
      activeDriverId: "campaign-os-production-db-adapter",
      adapterKind: "production_deferred",
      diagnostics: [
        {
          code: "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED",
          field: "activeDriverId",
          message: "Production database driver is a runtime boundary only; live connection is deferred.",
          severity: "warning",
        },
      ],
    };
  }

  if (persistenceMode === "local_json" || requestedDriverId === "campaign-os-local-json-adapter") {
    return {
      activeDriverId: "campaign-os-local-json-adapter",
      adapterKind: "local_json",
      diagnostics: [],
    };
  }

  return {
    activeDriverId: "campaign-os-memory-adapter",
    adapterKind: "memory",
    diagnostics: [],
  };
};

const resolveRuntimeStatus = ({
  adapterKind,
  diagnostics,
}: {
  adapterKind: ProductionPersistenceAdapterKind;
  diagnostics: readonly ProductionPersistenceRuntimeDiagnostic[];
}): ProductionPersistenceRuntimeStatus => {
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return "blocked";
  }

  return adapterKind === "production_deferred" ? "boundary_ready" : "active_local";
};

const createTransactionSummary = (
  adapterKind: ProductionPersistenceAdapterKind,
): TransactionCapabilitySummary => {
  if (adapterKind === "deterministic_test") {
    return {
      mode: "deterministic_test",
      supported: true,
      unitOfWorkId: "deterministic-test-unit-of-work",
    };
  }

  if (adapterKind === "production_deferred") {
    return {
      mode: "deferred_live",
      supported: false,
      unitOfWorkId: "production-unit-of-work-deferred",
    };
  }

  return {
    mode: "none",
    supported: false,
    unitOfWorkId: "local-unit-of-work-unavailable",
  };
};

const createQueryCapabilitySummary = (
  transactionMode: TransactionCapabilityMode,
): ProductionPersistenceRuntimeContract["queryCapability"] => {
  const summary = createDatabaseQueryAdapterSummary({
    transactionMode:
      transactionMode === "deterministic_test" || transactionMode === "deferred_live"
        ? transactionMode
        : "deterministic_test",
  });

  return {
    adHocRawSqlEnabled: summary.adHocRawSqlEnabled,
    liveQueryExecutionEnabled: summary.liveQueryExecutionEnabled,
    parameterizedQueries: summary.parameterizedQueries,
    repositoryContractCount: summary.repositoryContractCount,
    transactionMode,
  };
};

const runtimeDiagnosticFromProviderIssue = (
  issue: ReturnType<typeof createDatabaseProviderRegistryReport>["validation"]["issues"][number],
): ProductionPersistenceRuntimeDiagnostic => ({
  code:
    issue.code === "DATABASE_DRIVER_PRODUCTION_DEFERRED"
      ? "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED"
      : issue.code === "DATABASE_DRIVER_NOT_FOUND"
        || issue.code === "DATABASE_PROVIDER_NOT_FOUND"
        || issue.code === "DATABASE_PROVIDER_DRIVER_MISMATCH"
        || issue.code === "DATABASE_PROVIDER_DRIVER_UNKNOWN"
        || issue.code === "DATABASE_DRIVER_STORE_UNSUPPORTED"
        || issue.code === "DATABASE_PROVIDER_PRODUCTION_UNSUPPORTED"
          ? "PRODUCTION_PERSISTENCE_DRIVER_UNSUPPORTED"
          : "PRODUCTION_PERSISTENCE_CONFIG_REQUIRED",
  field: issue.field,
  message: issue.message,
  severity: issue.severity,
});

const driverCapabilitySummary = (
  capability?: DatabaseDriverCapabilityDescriptor,
) => ({
  pooling: capability?.pooling,
  requiresNetwork: capability?.requiresNetwork,
  requiresSecretManager: capability?.requiresSecretManager,
  supportsTransactions: capability?.transactions ?? false,
  transactions: capability?.transactions,
});

const createProviderDecision = (
  profileId: BackendRuntimeProfileId,
): ProductionPersistenceProviderDecision => {
  const providerReport = createDatabaseProviderRegistryReport({ profileId });
  const diagnostics = providerReport.validation.issues.map(runtimeDiagnosticFromProviderIssue);
  const status: ProductionPersistenceProviderDecision["status"] =
    providerReport.validation.valid ? "local-review" : "blocked";

  return {
    diagnostics,
    drivers: providerReport.drivers.map((driver) => ({
      capabilities: driverCapabilitySummary(driver.capability),
      deferredBlockers: [...driver.deferredBy],
      id: driver.id,
      label: driver.label,
      providerId: driver.providerId,
      requiredConfigKeys: [...driver.requiredConfigKeys],
      status: driver.status,
      supportedStoreIds: [...driver.supportedStoreIds],
    })),
    providers: providerReport.providers.map((provider) => ({
      driverIds: [...provider.driverIds],
      id: provider.id,
      label: provider.label,
      requiresNetwork: provider.requiresNetwork,
      requiresSecretManager: provider.requiresSecretManager,
      status: provider.status,
    })),
    selectedDriverId: providerReport.selectedDriverId,
    selectedProviderId: providerReport.selectedProviderId,
    status,
    valid: providerReport.validation.valid,
  };
};

const runtimeDiagnosticFromDriverIssue = (
  issue: ReturnType<typeof createPersistenceDriverRegistryReport>["validation"]["issues"][number],
): ProductionPersistenceRuntimeDiagnostic => ({
  code:
    issue.code === "PERSISTENCE_DRIVER_NOT_FOUND"
      ? "PRODUCTION_PERSISTENCE_DRIVER_UNSUPPORTED"
      : "PRODUCTION_PERSISTENCE_LIVE_CONNECTION_DEFERRED",
  field: issue.field,
  message: issue.message,
  severity: issue.severity,
});

const createDriverDecision = ({
  activeDriverId,
  adapterKind,
  connectionRequiredKeys,
  deferredDependencies,
  profileId,
}: {
  activeDriverId: string;
  adapterKind: ProductionPersistenceAdapterKind;
  connectionRequiredKeys: readonly string[];
  deferredDependencies: readonly DeferredPersistenceDependency[];
  profileId: BackendRuntimeProfileId;
}): ProductionPersistenceDriverDecision => {
  const registryReport = createPersistenceDriverRegistryReport({
    activeDriverId,
    profileId,
  });
  const activeDriver = registryReport.drivers.find((driver) => driver.id === activeDriverId);
  const diagnostics = registryReport.validation.issues.map(runtimeDiagnosticFromDriverIssue);
  const productionBlockerIds = deferredDependencies.map((dependency) => dependency.id);

  return {
    activeDriverId,
    adapterKind,
    diagnostics,
    drivers: registryReport.drivers.map((driver) => ({
      capabilities: {
        sideEffectPolicy: driver.sideEffectPolicy,
        supportsReset: driver.supportsReset,
        supportsTransactions: driver.supportsTransactions,
      },
      deferredBlockers:
        driver.kind === "production_deferred" ? productionBlockerIds : [],
      id: driver.id,
      kind: driver.kind,
      label: driver.label,
      requiredConfigKeys:
        driver.kind === "production_deferred" ? [...connectionRequiredKeys] : [],
      status: driver.status,
      supportedStoreIds: [...driver.ownerStores],
    })),
    status: activeDriver?.status ?? "unknown",
    valid: registryReport.validation.valid,
  };
};

export const createProductionPersistenceRuntimeContract = ({
  env = typeof process === "undefined" ? {} : process.env,
  requestedDriverId,
  ...configOptions
}: CreateProductionPersistenceRuntimeContractOptions = {}): ProductionPersistenceRuntimeContract => {
  const backendConfig = resolveBackendConfigContract({ env, ...configOptions });
  const rawRequestedDriverId = requestedDriverId ?? env.CAMPAIGN_OS_PERSISTENCE_DRIVER;
  const safeRequestedDriverId =
    rawRequestedDriverId && isSupportedDriverId(rawRequestedDriverId)
      ? rawRequestedDriverId
      : rawRequestedDriverId
        ? REDACTED_VALUE
        : undefined;
  const connection = createConnectionConfigSummary({
    env,
    profileId: backendConfig.profileId,
    requiredKeys:
      backendConfig.profileId === "production-required"
        ? ["CAMPAIGN_OS_DATABASE_URL"]
        : [],
  });
  const driver = resolveDriver({
    persistenceMode: backendConfig.persistenceMode,
    profileId: backendConfig.profileId,
    requestedDriverId: rawRequestedDriverId,
  });
  const providerDecision = createProviderDecision(backendConfig.profileId);
  const driverDecision = createDriverDecision({
    activeDriverId: driver.activeDriverId,
    adapterKind: driver.adapterKind,
    connectionRequiredKeys: connection.requiredKeys,
    deferredDependencies: productionPersistenceDeferredDependencies,
    profileId: backendConfig.profileId,
  });
  const diagnostics = [...connection.diagnostics, ...driver.diagnostics];
  const status = resolveRuntimeStatus({
    adapterKind: driver.adapterKind,
    diagnostics,
  });
  const transaction = createTransactionSummary(driver.adapterKind);
  const schemaManifest = createProductionDatabaseSchemaManifest();

  return {
    activeDriverId: driver.activeDriverId,
    adapterKind: driver.adapterKind,
    connection,
    deferredDependencies: productionPersistenceDeferredDependencies,
    diagnostics,
    driverDecision,
    foundationId: productionPersistenceFoundationId,
    id: "campaign-os-production-persistence-runtime",
    liveConnectionAttempted: false,
    profileId: backendConfig.profileId,
    productionBlockers: productionPersistenceDeferredDependencies.filter(
      (dependency) => dependency.requiredBeforeProduction,
    ),
    productionReady: false,
    providerDecision,
    queryCapability: createQueryCapabilitySummary(transaction.mode),
    requestedDriverId: safeRequestedDriverId,
    schemaManifest,
    schemaVersion: "v0.2.0",
    status,
    stores: requiredStoreCoverages,
    supportMode: backendConfig.profile.supportMode,
    transaction,
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
  };
};
