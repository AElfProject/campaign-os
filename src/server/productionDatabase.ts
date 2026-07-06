import type { BackendRuntimeProfileId } from "./backendProfiles";
import type { BackendStoreId, BackendStoreProductionMode } from "./persistenceAdapterPort";

export type ProductionDatabaseAdapterStatus = "contract_ready" | "dry_run_ready" | "blocked";
export type ProductionDatabaseAdapterKind = "production_database";
export type ProductionDatabaseStoreReadiness = "contract_ready" | "migration_pending" | "blocked";
export type ProductionDatabaseDiagnosticCode =
  | "PRODUCTION_DATABASE_CONTRACT_ONLY"
  | "PRODUCTION_DATABASE_CONFIG_REQUIRED"
  | "PRODUCTION_DATABASE_SECRET_REDACTED"
  | "PRODUCTION_DATABASE_STORE_MISSING_SCHEMA"
  | "PRODUCTION_DATABASE_STORE_MISSING_OWNER"
  | "PRODUCTION_DATABASE_STORE_MISSING_ENTITIES"
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
  ownerServiceId: string;
  productionMode: BackendStoreProductionMode;
  readiness: ProductionDatabaseStoreReadiness;
  schemaVersion: string;
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

export const productionDatabaseStoreRegistry: ProductionDatabaseStoreRegistryEntry[] = [
  {
    entities: ["Campaign", "CampaignStatus", "PublishChecklist", "ContractModeMetadata"],
    id: "campaign-db",
    label: "Campaign DB",
    migrationRequired: true,
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
    ownerServiceId: "points-ranking-service",
    productionMode: "relational_database",
    readiness: "contract_ready",
    schemaVersion: "v0.2.0",
  },
];

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

  for (const store of stores) {
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
    schemaVersion: "v0.2.0",
    status: localReviewOnly ? "contract_ready" : "blocked",
    stores: [...stores],
  };
};
