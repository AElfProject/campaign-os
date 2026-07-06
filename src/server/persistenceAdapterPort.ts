import type { CampaignOsPersistenceMode } from "./config";
import type { BackendRuntimeProfileId } from "./backendProfiles";

export type PersistenceAdapterKind = "memory" | "local_json" | "production_deferred";
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
  currentMode: BackendStoreCurrentMode;
  futureProductionMode: BackendStoreProductionMode;
  id: BackendStoreId;
  label: string;
  ownerServiceId: string;
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
  requiresConnectionString: boolean;
  requiresMigrationRunner: boolean;
  status: PersistenceAdapterStatus;
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
}

const productionDatabaseBlockers = [
  "production database adapter mission",
  "schema migration runner mission",
  "connection secret boundary",
];

export const backendStorePorts: BackendStorePort[] = [
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "seeded",
    futureProductionMode: "relational_database",
    id: "campaign-db",
    label: "Campaign DB",
    ownerServiceId: "campaign-service",
  },
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "memory",
    futureProductionMode: "relational_database",
    id: "wallet-session-db",
    label: "Wallet Session DB",
    ownerServiceId: "wallet-session-service",
  },
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "memory",
    futureProductionMode: "relational_database",
    id: "task-evidence-db",
    label: "Task Evidence DB",
    ownerServiceId: "verification-service",
  },
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "seeded",
    futureProductionMode: "relational_database",
    id: "i18n-content-db",
    label: "i18n Content DB",
    ownerServiceId: "i18n-content-service",
  },
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "seeded",
    futureProductionMode: "relational_database",
    id: "risk-event-db",
    label: "Risk Event DB",
    ownerServiceId: "risk-intelligence-service",
  },
  {
    adapterOwnerId: "campaign-os-production-db-adapter",
    attachPoint: "src/server/persistence.ts",
    blockedBy: productionDatabaseBlockers,
    currentMode: "deferred",
    futureProductionMode: "relational_database",
    id: "points-ledger",
    label: "Points Ledger",
    ownerServiceId: "points-ranking-service",
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

export const createPersistenceAdapterPortReport = ({
  persistenceMode = "memory",
  profileId = "local-review",
}: CreatePersistenceAdapterPortReportOptions = {}): PersistenceAdapterPortReport => {
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
    status: persistenceMode === "memory" ? "active" : "local_only",
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
    status: persistenceMode === "local_json" ? "active" : "local_only",
  };
  const productionDatabaseAdapter: PersistenceAdapterPort = {
    attachPoints: ["src/server/persistence.ts:createCampaignOsRepository"],
    diagnostics: [productionDeferredDiagnostic],
    durable: true,
    id: "campaign-os-production-db-adapter",
    kind: "production_deferred",
    label: "Future production database adapter",
    localOnly: false,
    ownerStores: storesForAdapter("campaign-os-production-db-adapter"),
    requiresConnectionString: true,
    requiresMigrationRunner: true,
    status: profileId === "production-required" ? "blocked" : "deferred",
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

  return {
    activeAdapter,
    adapters,
    stores: backendStorePorts,
    validation: {
      issues,
      valid: issues.every((issue) => issue.severity !== "error"),
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
