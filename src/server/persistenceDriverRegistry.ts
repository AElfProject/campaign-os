import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  productionDatabaseRequiredStoreIds,
  type ProductionDatabaseAdapterContract,
} from "./productionDatabase";
import type { BackendStoreId } from "./persistenceAdapterPort";
import type { ProductionPersistenceAdapterKind } from "./persistenceRuntime";

export type PersistenceDriverStatus = "active" | "available" | "deferred" | "blocked";
export type PersistenceDriverSideEffectPolicy =
  | "none"
  | "local_filesystem"
  | "live_external_deferred";
export type PersistenceDriverDiagnosticCode =
  | "PERSISTENCE_DRIVER_NOT_FOUND"
  | "PERSISTENCE_DRIVER_PRODUCTION_DEFERRED"
  | "PERSISTENCE_DRIVER_STORE_MISSING";

export interface PersistenceDriverDiagnostic {
  code: PersistenceDriverDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface PersistenceDriverDescriptor {
  durable: boolean;
  id: string;
  kind: ProductionPersistenceAdapterKind;
  label: string;
  localOnly: boolean;
  ownerStores: BackendStoreId[];
  requiresConnectionString: boolean;
  requiresMigrationGate: boolean;
  sideEffectPolicy: PersistenceDriverSideEffectPolicy;
  status: PersistenceDriverStatus;
  supportsReset: boolean;
  supportsTransactions: boolean;
}

export interface PersistenceDriverRegistryReport {
  activeDriverId: string;
  drivers: PersistenceDriverDescriptor[];
  validation: {
    issues: PersistenceDriverDiagnostic[];
    valid: boolean;
  };
}

export interface CreatePersistenceDriverRegistryReportOptions {
  activeDriverId?: string;
  profileId?: BackendRuntimeProfileId;
}

const memoryOwnerStores: BackendStoreId[] = ["wallet-session-db", "task-evidence-db"];
const localJsonOwnerStores: BackendStoreId[] = [
  "wallet-session-db",
  "task-evidence-db",
  "export-store",
];

export const persistenceDriverDescriptors: PersistenceDriverDescriptor[] = [
  {
    durable: false,
    id: "campaign-os-memory-adapter",
    kind: "memory",
    label: "Campaign OS memory adapter",
    localOnly: true,
    ownerStores: memoryOwnerStores,
    requiresConnectionString: false,
    requiresMigrationGate: false,
    sideEffectPolicy: "none",
    status: "available",
    supportsReset: true,
    supportsTransactions: false,
  },
  {
    durable: true,
    id: "campaign-os-local-json-adapter",
    kind: "local_json",
    label: "Campaign OS local JSON adapter",
    localOnly: true,
    ownerStores: localJsonOwnerStores,
    requiresConnectionString: false,
    requiresMigrationGate: false,
    sideEffectPolicy: "local_filesystem",
    status: "available",
    supportsReset: true,
    supportsTransactions: false,
  },
  {
    durable: false,
    id: "campaign-os-deterministic-test-adapter",
    kind: "deterministic_test",
    label: "Campaign OS deterministic test adapter",
    localOnly: true,
    ownerStores: [...productionDatabaseRequiredStoreIds],
    requiresConnectionString: false,
    requiresMigrationGate: false,
    sideEffectPolicy: "none",
    status: "available",
    supportsReset: true,
    supportsTransactions: true,
  },
  {
    durable: true,
    id: "campaign-os-production-db-adapter" satisfies ProductionDatabaseAdapterContract["id"],
    kind: "production_deferred",
    label: "Campaign OS production database adapter",
    localOnly: false,
    ownerStores: [...productionDatabaseRequiredStoreIds],
    requiresConnectionString: true,
    requiresMigrationGate: true,
    sideEffectPolicy: "live_external_deferred",
    status: "deferred",
    supportsReset: false,
    supportsTransactions: true,
  },
];

const requiredStores = new Set<BackendStoreId>([
  ...productionDatabaseRequiredStoreIds,
  "export-store",
]);

const cloneDescriptor = (
  descriptor: PersistenceDriverDescriptor,
  status: PersistenceDriverStatus,
): PersistenceDriverDescriptor => ({
  ...descriptor,
  ownerStores: [...descriptor.ownerStores],
  status,
});

const storeDiagnostics = (
  descriptors: readonly PersistenceDriverDescriptor[],
): PersistenceDriverDiagnostic[] => {
  const issues: PersistenceDriverDiagnostic[] = [];

  for (const descriptor of descriptors) {
    for (const storeId of descriptor.ownerStores) {
      if (!requiredStores.has(storeId)) {
        issues.push({
          code: "PERSISTENCE_DRIVER_STORE_MISSING",
          field: storeId,
          message: `Persistence driver '${descriptor.id}' references unknown store '${storeId}'.`,
          severity: "error",
        });
      }
    }
  }

  return issues;
};

const productionDeferredDiagnostic = (): PersistenceDriverDiagnostic => ({
  code: "PERSISTENCE_DRIVER_PRODUCTION_DEFERRED",
  field: "campaign-os-production-db-adapter",
  message:
    "Production database driver requires provider selection, connection config, migration gate, lock, and backup readiness before activation.",
  severity: "error",
});

const notFoundDiagnostic = (activeDriverId: string): PersistenceDriverDiagnostic => ({
  code: "PERSISTENCE_DRIVER_NOT_FOUND",
  field: activeDriverId,
  message: `Persistence driver '${activeDriverId}' is not registered.`,
  severity: "error",
});

export const createPersistenceDriverRegistryReport = ({
  activeDriverId = "campaign-os-memory-adapter",
  profileId = "local-review",
}: CreatePersistenceDriverRegistryReportOptions = {}): PersistenceDriverRegistryReport => {
  const diagnostics = storeDiagnostics(persistenceDriverDescriptors);
  const knownDriverIds = new Set(persistenceDriverDescriptors.map((driver) => driver.id));
  const activeDriverExists = knownDriverIds.has(activeDriverId);

  if (!activeDriverExists) {
    diagnostics.push(notFoundDiagnostic(activeDriverId));
  }

  const drivers = persistenceDriverDescriptors.map((descriptor) => {
    if (descriptor.id === "campaign-os-production-db-adapter") {
      const productionStatus: PersistenceDriverStatus =
        profileId === "production-required" ? "blocked" : "deferred";

      if (descriptor.id === activeDriverId && profileId === "production-required") {
        diagnostics.push(productionDeferredDiagnostic());
      }

      return cloneDescriptor(descriptor, productionStatus);
    }

    return cloneDescriptor(
      descriptor,
      descriptor.id === activeDriverId ? "active" : "available",
    );
  });

  return {
    activeDriverId,
    drivers,
    validation: {
      issues: diagnostics,
      valid: diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    },
  };
};
