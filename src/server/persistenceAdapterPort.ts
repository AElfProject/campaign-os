import type { CampaignOsPersistenceMode } from "./config";
import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createPersistenceDriverRegistryReport,
  persistenceDriverDescriptors,
  type PersistenceDriverDescriptor,
  type PersistenceDriverStatus,
  type PersistenceDriverDiagnostic,
  type PersistenceDriverSideEffectPolicy,
} from "./persistenceDriverRegistry";
import {
  createDatabaseQueryAdapterSummary,
  type DatabaseQueryAdapterSummary,
} from "./databaseQueryAdapterPort";
import {
  createProductionDatabaseAdapterContract,
  productionDatabaseStoreRegistry,
} from "./productionDatabase";

export type PersistenceAdapterKind = "memory" | "local_json" | "deterministic_test" | "production_deferred";
export type PersistenceAdapterStatus = "active" | "local_only" | "deferred" | "blocked";
export type BackendStoreCurrentMode = "seeded" | "memory" | "local_json" | "deferred";
export type BackendStoreProductionMode =
  | "relational_database"
  | "object_storage"
  | "analytics_warehouse"
  | "contract_index";
export type BackendStoreId =
  | "campaign-db"
  | "wallet-session-db"
  | "task-evidence-db"
  | "i18n-content-db"
  | "risk-event-db"
  | "points-ledger"
  | "export-store"
  | "analytics-warehouse"
  | "contract-index";
export type PersistenceAdapterDiagnosticCode =
  | "PRODUCTION_ADAPTER_DEFERRED"
  | "UNSUPPORTED_PERSISTENCE_ADAPTER";

export interface PersistenceAdapterDiagnostic {
  code: PersistenceAdapterDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface BackendStorePort {
  adapterOwnerId: string;
  attachPoint: string;
  blockedBy: string[];
  entities?: string[];
  currentMode: BackendStoreCurrentMode;
  futureProductionMode: BackendStoreProductionMode;
  id: BackendStoreId;
  label: string;
  ownerServiceId: string;
  schemaVersion?: string;
}

export interface PersistenceAdapterPort {
  attachPoints: string[];
  diagnostics: PersistenceAdapterDiagnostic[];
  durable: boolean;
  id: string;
  kind: PersistenceAdapterKind;
  label: string;
  localOnly: boolean;
  ownerStores: BackendStoreId[];
  queryCapability?: Pick<
    DatabaseQueryAdapterSummary,
    | "adHocRawSqlEnabled"
    | "liveQueryExecutionEnabled"
    | "parameterizedQueries"
    | "transactionMode"
  >;
  repositoryContractCount?: number;
  requiresConnectionString: boolean;
  requiresMigrationGate?: boolean;
  requiresMigrationRunner: boolean;
  sideEffectPolicy?: PersistenceDriverSideEffectPolicy;
  schemaVersion?: string;
  status: PersistenceAdapterStatus;
  supportsReset?: boolean;
  supportsTransactions?: boolean;
}

export interface PersistenceAdapterPortReport {
  activeAdapter: PersistenceAdapterPort;
  adapters: PersistenceAdapterPort[];
  stores: BackendStorePort[];
  validation: {
    issues: PersistenceAdapterDiagnostic[];
    valid: boolean;
  };
}

export interface CreatePersistenceAdapterPortReportOptions {
  persistenceMode?: CampaignOsPersistenceMode;
  profileId?: BackendRuntimeProfileId;
  activeDriverId?: string;
}

const productionDatabaseBlockers = [
  "live production database provider selection mission",
  "protected live migration execution mission",
  "connection secret boundary",
];

const productionStoreById = Object.fromEntries(
  productionDatabaseStoreRegistry.map((store) => [store.id, store]),
) as Partial<Record<BackendStoreId, (typeof productionDatabaseStoreRegistry)[number]>>;

export const backendStorePorts: BackendStorePort[] = [
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "seeded",
    entities: productionStoreById["campaign-db"]?.entities,
    futureProductionMode: "relational_database",
    id: "campaign-db",
    label: "Campaign DB",
    ownerServiceId: "campaign-service",
    schemaVersion: productionStoreById["campaign-db"]?.schemaVersion,
  },
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "memory",
    entities: productionStoreById["wallet-session-db"]?.entities,
    futureProductionMode: "relational_database",
    id: "wallet-session-db",
    label: "Wallet Session DB",
    ownerServiceId: "wallet-session-service",
    schemaVersion: productionStoreById["wallet-session-db"]?.schemaVersion,
  },
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "memory",
    entities: productionStoreById["task-evidence-db"]?.entities,
    futureProductionMode: "relational_database",
    id: "task-evidence-db",
    label: "Task Evidence DB",
    ownerServiceId: "verification-service",
    schemaVersion: productionStoreById["task-evidence-db"]?.schemaVersion,
  },
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "seeded",
    entities: productionStoreById["i18n-content-db"]?.entities,
    futureProductionMode: "relational_database",
    id: "i18n-content-db",
    label: "i18n Content DB",
    ownerServiceId: "i18n-content-service",
    schemaVersion: productionStoreById["i18n-content-db"]?.schemaVersion,
  },
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "seeded",
    entities: productionStoreById["risk-event-db"]?.entities,
    futureProductionMode: "relational_database",
    id: "risk-event-db",
    label: "Risk Event DB",
    ownerServiceId: "risk-intelligence-service",
    schemaVersion: productionStoreById["risk-event-db"]?.schemaVersion,
  },
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "deferred",
    entities: productionStoreById["points-ledger"]?.entities,
    futureProductionMode: "relational_database",
    id: "points-ledger",
    label: "Points Ledger",
    ownerServiceId: "points-ranking-service",
    schemaVersion: productionStoreById["points-ledger"]?.schemaVersion,
  },
  {
    adapterOwnerId: "campaign-os-object-storage-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: ["object storage provider mission", "signed URL safety review"],
    currentMode: "deferred",
    futureProductionMode: "object_storage",
    id: "export-store",
    label: "Export Store",
    ownerServiceId: "export-service",
  },
  {
    adapterOwnerId: "campaign-os-analytics-warehouse-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: ["analytics warehouse adapter mission", "event ingestion contract"],
    currentMode: "deferred",
    futureProductionMode: "analytics_warehouse",
    id: "analytics-warehouse",
    label: "Analytics Warehouse",
    ownerServiceId: "analytics-service",
  },
  {
    adapterOwnerId: "campaign-os-contract-index-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: ["contract writer mission", "contract indexer mission"],
    currentMode: "deferred",
    futureProductionMode: "contract_index",
    id: "contract-index",
    label: "Contract Index",
    ownerServiceId: "contract-ops-service",
  },
];

const storesForAdapter = (adapterOwnerId: string): BackendStoreId[] =>
  backendStorePorts
    .filter((store) => store.adapterOwnerId === adapterOwnerId)
    .map((store) => store.id);

const productionDeferredDiagnostic: PersistenceAdapterDiagnostic = {
  code: "PRODUCTION_ADAPTER_DEFERRED",
  field: "productionAdapter",
  message:
    "Production persistence adapters are deferred in Mission 168; local review cannot activate production database, storage, analytics, or contract index adapters.",
  severity: "warning",
};

const queryCapabilitySummary = (transactionMode: DatabaseQueryAdapterSummary["transactionMode"]) => {
  const summary = createDatabaseQueryAdapterSummary({ transactionMode });

  return {
    queryCapability: {
      adHocRawSqlEnabled: summary.adHocRawSqlEnabled,
      liveQueryExecutionEnabled: summary.liveQueryExecutionEnabled,
      parameterizedQueries: summary.parameterizedQueries,
      transactionMode: summary.transactionMode,
    },
    repositoryContractCount: summary.repositoryContractCount,
  };
};

export const createPersistenceAdapterPortReport = ({
  activeDriverId,
  persistenceMode = "memory",
  profileId = "local-review",
}: CreatePersistenceAdapterPortReportOptions = {}): PersistenceAdapterPortReport => {
  const productionDatabaseContract = createProductionDatabaseAdapterContract({
    profileId,
  });
  const resolvedActiveDriverId =
    activeDriverId
    ?? (persistenceMode === "local_json" ? "campaign-os-local-json-adapter" : "campaign-os-memory-adapter");
  const driverReport = createPersistenceDriverRegistryReport({
    activeDriverId: resolvedActiveDriverId,
    profileId,
  });
  const driverById = Object.fromEntries(
    driverReport.drivers.map((driver) => [driver.id, driver]),
  ) as Partial<Record<string, PersistenceDriverDescriptor>>;
  const driverStatus = (id: string, fallback: PersistenceAdapterStatus): PersistenceAdapterStatus => {
    const status = driverById[id]?.status;

    if (status === "available") {
      return "local_only";
    }

    if (status === "active" || status === "blocked" || status === "deferred") {
      return status;
    }

    return fallback;
  };
  const driverDetails = (id: string) => {
    const driver = driverById[id];

    return driver
      ? {
        requiresMigrationGate: driver.requiresMigrationGate,
        sideEffectPolicy: driver.sideEffectPolicy,
        supportsReset: driver.supportsReset,
        supportsTransactions: driver.supportsTransactions,
      }
      : {};
  };
  const memoryAdapter: PersistenceAdapterPort = {
    attachPoints: ["src/server/persistence.ts:createCampaignOsMemoryRepository"],
    diagnostics: [],
    durable: false,
    id: "campaign-os-memory-adapter",
    kind: "memory",
    label: "Campaign OS memory adapter",
    localOnly: true,
    ownerStores: ["wallet-session-db", "task-evidence-db"],
    requiresConnectionString: false,
    requiresMigrationRunner: false,
    status: driverStatus("campaign-os-memory-adapter", persistenceMode === "memory" ? "active" : "local_only"),
    ...driverDetails("campaign-os-memory-adapter"),
  };
  const localJsonAdapter: PersistenceAdapterPort = {
    attachPoints: ["src/server/persistence.ts:createCampaignOsJsonRepository"],
    diagnostics: [],
    durable: true,
    id: "campaign-os-local-json-adapter",
    kind: "local_json",
    label: "Campaign OS local JSON adapter",
    localOnly: true,
    ownerStores: ["wallet-session-db", "task-evidence-db", "export-store"],
    requiresConnectionString: false,
    requiresMigrationRunner: false,
    status: driverStatus("campaign-os-local-json-adapter", persistenceMode === "local_json" ? "active" : "local_only"),
    ...driverDetails("campaign-os-local-json-adapter"),
  };
  const deterministicTestAdapter: PersistenceAdapterPort = {
    attachPoints: ["src/server/persistence.ts:createCampaignOsDeterministicTestRepository"],
    diagnostics: [],
    durable: false,
    id: "campaign-os-deterministic-test-adapter",
    kind: "deterministic_test",
    label: "Campaign OS deterministic test adapter",
    localOnly: true,
    ownerStores: storesForAdapter("campaign-os-production-db-adapter"),
    ...queryCapabilitySummary("deterministic_test"),
    requiresConnectionString: false,
    requiresMigrationRunner: false,
    status: driverStatus("campaign-os-deterministic-test-adapter", "local_only"),
    ...driverDetails("campaign-os-deterministic-test-adapter"),
  };
  const productionDatabaseAdapter: PersistenceAdapterPort = {
    attachPoints: ["src/server/persistence.ts:createCampaignOsRepository"],
    diagnostics: [
      ...productionDatabaseContract.diagnostics.map<PersistenceAdapterDiagnostic>((diagnostic) => ({
        code: "PRODUCTION_ADAPTER_DEFERRED",
        field: diagnostic.field,
        message: diagnostic.message,
        severity: diagnostic.severity,
      })),
    ],
    durable: true,
    id: productionDatabaseContract.id,
    kind: "production_deferred",
    label: productionDatabaseContract.label,
    localOnly: productionDatabaseContract.localReviewOnly,
    ownerStores: [...productionDatabaseContract.ownerStores],
    ...queryCapabilitySummary("deterministic_test"),
    requiresConnectionString: productionDatabaseContract.requiresConnectionString,
    requiresMigrationGate: driverById[productionDatabaseContract.id]?.requiresMigrationGate,
    requiresMigrationRunner: productionDatabaseContract.requiresMigrationRunner,
    sideEffectPolicy: driverById[productionDatabaseContract.id]?.sideEffectPolicy,
    schemaVersion: productionDatabaseContract.schemaVersion,
    status: driverStatus(productionDatabaseContract.id, profileId === "production-required" ? "blocked" : "deferred"),
    supportsReset: driverById[productionDatabaseContract.id]?.supportsReset,
    supportsTransactions: driverById[productionDatabaseContract.id]?.supportsTransactions,
  };
  const objectStorageAdapter: PersistenceAdapterPort = {
    attachPoints: ["src/server/persistence.ts"],
    diagnostics: [productionDeferredDiagnostic],
    durable: true,
    id: "campaign-os-object-storage-adapter",
    kind: "production_deferred",
    label: "Future export object storage adapter",
    localOnly: false,
    ownerStores: storesForAdapter("campaign-os-object-storage-adapter"),
    requiresConnectionString: true,
    requiresMigrationRunner: false,
    status: "deferred",
  };
  const analyticsWarehouseAdapter: PersistenceAdapterPort = {
    attachPoints: ["src/server/persistence.ts"],
    diagnostics: [productionDeferredDiagnostic],
    durable: true,
    id: "campaign-os-analytics-warehouse-adapter",
    kind: "production_deferred",
    label: "Future analytics warehouse adapter",
    localOnly: false,
    ownerStores: storesForAdapter("campaign-os-analytics-warehouse-adapter"),
    requiresConnectionString: true,
    requiresMigrationRunner: false,
    status: "deferred",
  };
  const contractIndexAdapter: PersistenceAdapterPort = {
    attachPoints: ["src/server/persistence.ts"],
    diagnostics: [productionDeferredDiagnostic],
    durable: true,
    id: "campaign-os-contract-index-adapter",
    kind: "production_deferred",
    label: "Future contract index adapter",
    localOnly: false,
    ownerStores: storesForAdapter("campaign-os-contract-index-adapter"),
    requiresConnectionString: true,
    requiresMigrationRunner: false,
    status: "deferred",
  };
  const adapters = [
    memoryAdapter,
    localJsonAdapter,
    deterministicTestAdapter,
    productionDatabaseAdapter,
    objectStorageAdapter,
    analyticsWarehouseAdapter,
    contractIndexAdapter,
  ];
  const activeAdapter =
    adapters.find((adapter) => adapter.status === "active") ?? memoryAdapter;
  const issues = validatePersistenceAdapterPorts({
    adapters,
    profileId,
    stores: backendStorePorts,
  });
  const driverIssues = driverReport.validation.issues.map<PersistenceAdapterDiagnostic>((issue: PersistenceDriverDiagnostic) => ({
    code: issue.code === "PERSISTENCE_DRIVER_NOT_FOUND"
      ? "UNSUPPORTED_PERSISTENCE_ADAPTER"
      : "PRODUCTION_ADAPTER_DEFERRED",
    field: issue.field,
    message: issue.message,
    severity: issue.severity,
  }));

  return {
    activeAdapter,
    adapters,
    stores: backendStorePorts,
    validation: {
      issues: [...issues, ...driverIssues],
      valid: [...issues, ...driverIssues].every((issue) => issue.severity !== "error"),
    },
  };
};

export const validatePersistenceAdapterPorts = ({
  adapters,
  profileId = "local-review",
  stores,
}: {
  adapters: readonly PersistenceAdapterPort[];
  profileId?: BackendRuntimeProfileId;
  stores: readonly BackendStorePort[];
}): PersistenceAdapterDiagnostic[] => {
  const adapterIds = new Set(adapters.map((adapter) => adapter.id));
  const issues: PersistenceAdapterDiagnostic[] = [];

  for (const adapter of adapters) {
    if (
      profileId === "local-review"
      && adapter.kind === "production_deferred"
      && adapter.status === "active"
    ) {
      issues.push({
        code: "PRODUCTION_ADAPTER_DEFERRED",
        field: adapter.id,
        message: `Production adapter '${adapter.id}' cannot be active in local review.`,
        severity: "error",
      });
    }
  }

  for (const store of stores) {
    if (!adapterIds.has(store.adapterOwnerId)) {
      issues.push({
        code: "UNSUPPORTED_PERSISTENCE_ADAPTER",
        field: store.id,
        message: `Store '${store.id}' references unknown adapter '${store.adapterOwnerId}'.`,
        severity: "error",
      });
    }
  }

  return issues;
};
