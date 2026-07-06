import type { BackendRuntimeProfileId } from "./backendProfiles";
import type { BackendStoreId, BackendStoreProductionMode } from "./persistenceAdapterPort";

export type ProductionDatabaseAdapterStatus = "contract_ready" | "dry_run_ready" | "blocked";
export type ProductionDatabaseAdapterKind = "production_database";
export type ProductionDatabaseStoreReadiness = "contract_ready" | "migration_pending" | "blocked";
export type ProductionDatabaseDiagnosticCode =
  | "PRODUCTION_DATABASE_CONTRACT_ONLY"
  | "PRODUCTION_DATABASE_CONFIG_REQUIRED"
  | "PRODUCTION_DATABASE_SECRET_REDACTED"
  | "PRODUCTION_DATABASE_STORE_DUPLICATE_ID"
  | "PRODUCTION_DATABASE_STORE_MISSING_OPERATION_CAPABILITY"
  | "PRODUCTION_DATABASE_STORE_MISSING_SCHEMA"
  | "PRODUCTION_DATABASE_STORE_MISSING_OWNER"
  | "PRODUCTION_DATABASE_STORE_MISSING_ENTITIES"
  | "PRODUCTION_DATABASE_STORE_REQUIRED_MISSING"
  | "PRODUCTION_DATABASE_STORE_UNSUPPORTED_MODE";

export interface ProductionDatabaseDiagnostic {
  code: ProductionDatabaseDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface ProductionDatabaseStoreRegistryEntry {
  entities: string[];
  id: BackendStoreId;
  label: string;
  migrationRequired: boolean;
  operationCapability?: ProductionDatabaseStoreOperationCapability;
  ownerServiceId: string;
  productionMode: BackendStoreProductionMode;
  readiness: ProductionDatabaseStoreReadiness;
  schemaVersion: string;
}

export interface ProductionDatabaseStoreOperationCapability {
  adHocRawSqlEnabled: false;
  migrationPlanRequired: boolean;
  operations: string[];
  parameterizedQueries: boolean;
  transactions: boolean;
}

export interface ProductionDatabaseSchemaManifest {
  id: "campaign-os-production-db-schema-v0.2";
  migrationRequiredStoreIds: BackendStoreId[];
  requiredStoreIds: BackendStoreId[];
  schemaVersion: string;
  storeCount: number;
  stores: ProductionDatabaseStoreRegistryEntry[];
}

export interface ProductionDatabaseAdapterContract {
  diagnostics: ProductionDatabaseDiagnostic[];
  id: "campaign-os-production-db-adapter";
  kind: ProductionDatabaseAdapterKind;
  label: string;
  localReviewOnly: boolean;
  ownerStores: BackendStoreId[];
  readinessLabel: string;
  requiresConnectionString: boolean;
  requiresMigrationRunner: boolean;
  schemaManifest: ProductionDatabaseSchemaManifest;
  schemaVersion: string;
  status: ProductionDatabaseAdapterStatus;
  stores: ProductionDatabaseStoreRegistryEntry[];
}

export interface CreateProductionDatabaseAdapterContractOptions {
  profileId?: BackendRuntimeProfileId;
  requestedConnectionLabel?: string;
  stores?: readonly ProductionDatabaseStoreRegistryEntry[];
}

const REDACTED_VALUE = "[redacted]";

export const productionDatabaseRequiredStoreIds = [
  "campaign-db",
  "wallet-session-db",
  "task-evidence-db",
  "i18n-content-db",
  "risk-event-db",
  "points-ledger",
] as const satisfies readonly BackendStoreId[];

const defaultOperationCapability: ProductionDatabaseStoreOperationCapability = {
  adHocRawSqlEnabled: false,
  migrationPlanRequired: true,
  operations: ["select", "count", "lookup", "insert", "update", "delete", "upsert", "migration_plan"],
  parameterizedQueries: true,
  transactions: true,
};

export const productionDatabaseStoreRegistry: ProductionDatabaseStoreRegistryEntry[] = [
  {
    entities: ["Campaign", "CampaignStatus", "PublishChecklist", "ContractModeMetadata"],
    id: "campaign-db",
    label: "Campaign DB",
    migrationRequired: true,
    operationCapability: defaultOperationCapability,
    ownerServiceId: "campaign-service",
    productionMode: "relational_database",
    readiness: "contract_ready",
    schemaVersion: "v0.2.0",
  },
  {
    entities: ["NormalizedWalletSession", "AccountTypeProof", "WalletSourceProof"],
    id: "wallet-session-db",
    label: "Wallet Session DB",
    migrationRequired: true,
    operationCapability: defaultOperationCapability,
    ownerServiceId: "wallet-session-service",
    productionMode: "relational_database",
    readiness: "contract_ready",
    schemaVersion: "v0.2.0",
  },
  {
    entities: ["CampaignTask", "TaskCompletion", "EvidenceHash", "ManualReviewState"],
    id: "task-evidence-db",
    label: "Task Evidence DB",
    migrationRequired: true,
    operationCapability: defaultOperationCapability,
    ownerServiceId: "verification-service",
    productionMode: "relational_database",
    readiness: "contract_ready",
    schemaVersion: "v0.2.0",
  },
  {
    entities: ["I18nContentRevision", "LocaleDraft", "HumanReviewState"],
    id: "i18n-content-db",
    label: "i18n Content DB",
    migrationRequired: true,
    operationCapability: defaultOperationCapability,
    ownerServiceId: "i18n-content-service",
    productionMode: "relational_database",
    readiness: "contract_ready",
    schemaVersion: "v0.2.0",
  },
  {
    entities: ["RiskEvent", "ParticipantRiskFlag", "ReferralRiskReview"],
    id: "risk-event-db",
    label: "Risk Event DB",
    migrationRequired: true,
    operationCapability: defaultOperationCapability,
    ownerServiceId: "risk-intelligence-service",
    productionMode: "relational_database",
    readiness: "contract_ready",
    schemaVersion: "v0.2.0",
  },
  {
    entities: ["PointsLedgerEntry", "ParticipantScore", "LeaderboardProjection"],
    id: "points-ledger",
    label: "Points Ledger",
    migrationRequired: true,
    operationCapability: defaultOperationCapability,
    ownerServiceId: "points-ranking-service",
    productionMode: "relational_database",
    readiness: "contract_ready",
    schemaVersion: "v0.2.0",
  },
];

export const createProductionDatabaseSchemaManifest = (
  stores: readonly ProductionDatabaseStoreRegistryEntry[] = productionDatabaseStoreRegistry,
): ProductionDatabaseSchemaManifest => ({
  id: "campaign-os-production-db-schema-v0.2",
  migrationRequiredStoreIds: stores
    .filter((store) => store.migrationRequired)
    .map((store) => store.id),
  requiredStoreIds: [...productionDatabaseRequiredStoreIds],
  schemaVersion: "v0.2.0",
  storeCount: stores.length,
  stores: stores.map((store) => ({
    ...store,
    entities: [...store.entities],
    operationCapability: store.operationCapability
      ? {
        ...store.operationCapability,
        operations: [...store.operationCapability.operations],
      }
      : undefined,
  })),
});

export const productionDatabaseSchemaManifest =
  createProductionDatabaseSchemaManifest(productionDatabaseStoreRegistry);

const sanitizeConnectionLabel = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : REDACTED_VALUE;

const contractOnlyDiagnostic: ProductionDatabaseDiagnostic = {
  code: "PRODUCTION_DATABASE_CONTRACT_ONLY",
  field: "productionDatabase",
  message:
    "Production database adapter is contract-ready only in Mission 169; local review does not open live database connections.",
  severity: "info",
};

const productionConfigRequiredDiagnostic = (
  requestedConnectionLabel?: string,
): ProductionDatabaseDiagnostic => {
  const redactedValue = sanitizeConnectionLabel(requestedConnectionLabel);
  const suffix = redactedValue ? ` Requested value: ${redactedValue}.` : "";

  return {
    code: "PRODUCTION_DATABASE_CONFIG_REQUIRED",
    field: "connection",
    message: `Production-required profile needs a configured database boundary before readiness can pass.${suffix}`,
    severity: "error",
  };
};

const secretRedactedDiagnostic = (): ProductionDatabaseDiagnostic => ({
  code: "PRODUCTION_DATABASE_SECRET_REDACTED",
  field: "connection",
  message: "A production database connection value was redacted from readiness diagnostics.",
  severity: "info",
});

export const validateProductionDatabaseStores = (
  stores: readonly ProductionDatabaseStoreRegistryEntry[],
): ProductionDatabaseDiagnostic[] => {
  const issues: ProductionDatabaseDiagnostic[] = [];
  const byStoreId = new Map<BackendStoreId, ProductionDatabaseStoreRegistryEntry>();
  const duplicateStoreIds = new Set<BackendStoreId>();

  for (const store of stores) {
    if (byStoreId.has(store.id)) {
      duplicateStoreIds.add(store.id);
      continue;
    }

    byStoreId.set(store.id, store);
  }

  for (const storeId of productionDatabaseRequiredStoreIds) {
    if (!byStoreId.has(storeId)) {
      issues.push({
        code: "PRODUCTION_DATABASE_STORE_REQUIRED_MISSING",
        field: storeId,
        message: `Production database schema manifest is missing required store '${storeId}'.`,
        severity: "error",
      });
    }
  }

  for (const storeId of duplicateStoreIds) {
    issues.push({
      code: "PRODUCTION_DATABASE_STORE_DUPLICATE_ID",
      field: storeId,
      message: `Production database schema manifest contains duplicate store '${storeId}'.`,
      severity: "error",
    });
  }

  for (const store of byStoreId.values()) {
    if (!store.ownerServiceId) {
      issues.push({
        code: "PRODUCTION_DATABASE_STORE_MISSING_OWNER",
        field: store.id,
        message: `Production database store '${store.id}' is missing ownerServiceId.`,
        severity: "error",
      });
    }

    if (store.entities.length === 0) {
      issues.push({
        code: "PRODUCTION_DATABASE_STORE_MISSING_ENTITIES",
        field: store.id,
        message: `Production database store '${store.id}' does not declare entity coverage.`,
        severity: "error",
      });
    }

    if (!store.schemaVersion) {
      issues.push({
        code: "PRODUCTION_DATABASE_STORE_MISSING_SCHEMA",
        field: store.id,
        message: `Production database store '${store.id}' is missing schemaVersion.`,
        severity: "error",
      });
    }

    if (store.productionMode !== "relational_database") {
      issues.push({
        code: "PRODUCTION_DATABASE_STORE_UNSUPPORTED_MODE",
        field: store.id,
        message: `Production database store '${store.id}' must use relational_database mode.`,
        severity: "error",
      });
    }

    if (!store.operationCapability) {
      issues.push({
        code: "PRODUCTION_DATABASE_STORE_MISSING_OPERATION_CAPABILITY",
        field: store.id,
        message: `Production database store '${store.id}' is missing operation capability metadata.`,
        severity: "error",
      });
    }
  }

  return issues;
};

export const validateProductionDatabaseAdapterContract = (
  contract: ProductionDatabaseAdapterContract,
): ProductionDatabaseDiagnostic[] => [
  ...contract.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
  ...validateProductionDatabaseStores(contract.stores),
];

export const createProductionDatabaseAdapterContract = ({
  profileId = "local-review",
  requestedConnectionLabel,
  stores = productionDatabaseStoreRegistry,
}: CreateProductionDatabaseAdapterContractOptions = {}): ProductionDatabaseAdapterContract => {
  const localReviewOnly = profileId !== "production-required";
  const diagnostics: ProductionDatabaseDiagnostic[] = [
    localReviewOnly
      ? contractOnlyDiagnostic
      : productionConfigRequiredDiagnostic(requestedConnectionLabel),
    ...validateProductionDatabaseStores(stores),
  ];

  if (requestedConnectionLabel) {
    diagnostics.push(secretRedactedDiagnostic());
  }

  return {
    diagnostics,
    id: "campaign-os-production-db-adapter",
    kind: "production_database",
    label: "Campaign OS production database adapter contract",
    localReviewOnly,
    ownerStores: [...productionDatabaseRequiredStoreIds],
    readinessLabel: localReviewOnly
      ? "Contract-ready for local review; live database disabled."
      : "Blocked until production database config and migration readiness are provided.",
    requiresConnectionString: true,
    requiresMigrationRunner: true,
    schemaManifest: createProductionDatabaseSchemaManifest(stores),
    schemaVersion: "v0.2.0",
    status: localReviewOnly ? "contract_ready" : "blocked",
    stores: [...stores],
  };
};
