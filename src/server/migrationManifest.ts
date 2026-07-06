import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  backendStorePorts,
  type BackendStoreId,
  type BackendStorePort,
} from "./persistenceAdapterPort";

export type MigrationRunnerStatus = "disabled_local_review" | "deferred" | "ready";
export type MigrationStoreReadiness = "manifested" | "deferred" | "blocked";
export type MigrationDiagnosticCode =
  | "MIGRATION_RUNNER_DISABLED_LOCAL_REVIEW"
  | "MIGRATION_STORE_MISSING_OWNER"
  | "MIGRATION_STORE_MISSING_PRODUCTION_MODE";

export interface MigrationDiagnostic {
  code: MigrationDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface MigrationStoreManifest {
  currentMode: BackendStorePort["currentMode"];
  id: BackendStoreId;
  migrationRequired: boolean;
  ownerServiceId: string;
  productionMode: BackendStorePort["futureProductionMode"];
  readiness: MigrationStoreReadiness;
  targetSchemaVersion: string;
}

export interface MigrationManifest {
  diagnostics: MigrationDiagnostic[];
  manifestVersion: string;
  noDestructiveOperations: true;
  noLiveMigrationCommand: true;
  noMigrationRunner: boolean;
  runnerStatus: MigrationRunnerStatus;
  stores: MigrationStoreManifest[];
  validation: {
    issues: MigrationDiagnostic[];
    valid: boolean;
  };
}

export interface CreateMigrationManifestOptions {
  profileId?: BackendRuntimeProfileId;
  stores?: readonly BackendStorePort[];
}

const migrationStoreReadiness = (store: BackendStorePort): MigrationStoreReadiness => {
  if (store.currentMode === "deferred") {
    return "deferred";
  }

  return "manifested";
};

const toMigrationStoreManifest = (store: BackendStorePort): MigrationStoreManifest => ({
  currentMode: store.currentMode,
  id: store.id,
  migrationRequired: store.futureProductionMode !== "object_storage",
  ownerServiceId: store.ownerServiceId,
  productionMode: store.futureProductionMode,
  readiness: migrationStoreReadiness(store),
  targetSchemaVersion: "v0.1.0-target",
});

export const createMigrationManifest = ({
  profileId = "local-review",
  stores = backendStorePorts,
}: CreateMigrationManifestOptions = {}): MigrationManifest => {
  const runnerStatus: MigrationRunnerStatus =
    profileId === "local-review" ? "disabled_local_review" : "deferred";
  const migrationStores = stores.map(toMigrationStoreManifest);
  const runnerDiagnostic: MigrationDiagnostic =
    runnerStatus === "disabled_local_review"
      ? {
        code: "MIGRATION_RUNNER_DISABLED_LOCAL_REVIEW",
        field: "runnerStatus",
        message:
            "Migration runner is disabled for local review; Mission 168 exposes manifest metadata only.",
        severity: "info",
      }
      : {
        code: "MIGRATION_RUNNER_DISABLED_LOCAL_REVIEW",
        field: "runnerStatus",
        message:
            "Migration runner remains deferred until a production persistence mission provides an executable runner.",
        severity: "warning",
      };
  const issues = validateMigrationManifestStores(migrationStores);
  const diagnostics = [runnerDiagnostic, ...issues];

  return {
    diagnostics,
    manifestVersion: "0.1.0",
    noDestructiveOperations: true,
    noLiveMigrationCommand: true,
    noMigrationRunner: true,
    runnerStatus,
    stores: migrationStores,
    validation: {
      issues,
      valid: issues.every((issue) => issue.severity !== "error"),
    },
  };
};

export const validateMigrationManifestStores = (
  stores: readonly MigrationStoreManifest[],
): MigrationDiagnostic[] => {
  const issues: MigrationDiagnostic[] = [];

  for (const store of stores) {
    if (!store.ownerServiceId) {
      issues.push({
        code: "MIGRATION_STORE_MISSING_OWNER",
        field: store.id,
        message: `Migration store '${store.id}' is missing ownerServiceId.`,
        severity: "error",
      });
    }

    if (store.migrationRequired && !store.productionMode) {
      issues.push({
        code: "MIGRATION_STORE_MISSING_PRODUCTION_MODE",
        field: store.id,
        message: `Migration store '${store.id}' is missing future production mode.`,
        severity: "error",
      });
    }
  }

  return issues;
};
