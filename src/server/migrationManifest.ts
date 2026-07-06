import type { BackendRuntimeProfileId } from "./backendProfiles";
import { createMigrationExecutionGate, type MigrationExecutionGate, type MigrationExecutionGateDiagnostic } from "./migrationExecutionGate";
import {
  backendStorePorts,
  type BackendStoreId,
  type BackendStorePort,
} from "./persistenceAdapterPort";
import { createConnectionConfigSummary } from "./persistenceRuntime";
import {
  createMigrationRunnerPlan,
  defaultSchemaMigrations,
  type MigrationRunnerDiagnostic,
  type MigrationRunnerPlan,
  type SchemaMigrationDefinition,
} from "./migrationRunner";

export type MigrationRunnerStatus = "disabled_local_review" | "deferred" | "ready";
export type MigrationStoreReadiness = "manifested" | "deferred" | "blocked";
export type MigrationDiagnosticCode =
  | "MIGRATION_RUNNER_DISABLED_LOCAL_REVIEW"
  | "MIGRATION_RUNNER_DEFERRED"
  | MigrationExecutionGateDiagnostic["code"]
  | MigrationRunnerDiagnostic["code"]
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
  executionGate: MigrationExecutionGate;
  migrations: SchemaMigrationDefinition[];
  manifestVersion: string;
  noDestructiveOperations: true;
  noLiveMigrationCommand: true;
  noMigrationRunner: boolean;
  runnerPlan: MigrationRunnerPlan;
  runnerStatus: MigrationRunnerStatus;
  stores: MigrationStoreManifest[];
  validation: {
    issues: MigrationDiagnostic[];
    valid: boolean;
  };
}

export interface CreateMigrationManifestOptions {
  env?: Record<string, string | undefined>;
  liveMigrationApproved?: boolean;
  migrations?: readonly SchemaMigrationDefinition[];
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
  targetSchemaVersion: store.schemaVersion ?? "v0.2.0",
});

export const createMigrationManifest = ({
  env = typeof process === "undefined" ? {} : process.env,
  liveMigrationApproved,
  migrations = defaultSchemaMigrations,
  profileId = "local-review",
  stores = backendStorePorts,
}: CreateMigrationManifestOptions = {}): MigrationManifest => {
  const runnerStatus: MigrationRunnerStatus =
    profileId === "local-review" ? "disabled_local_review" : "deferred";
  const migrationStores = stores.map(toMigrationStoreManifest);
  const runnerPlan = createMigrationRunnerPlan({
    migrations,
    profileId,
  });
  const executionGate = createMigrationExecutionGate({
    connection: createConnectionConfigSummary({ env, profileId }),
    liveMigrationApproved,
    migrationPlan: runnerPlan,
    profileId,
  });
  const runnerDiagnostic: MigrationDiagnostic =
    runnerStatus === "disabled_local_review"
      ? {
        code: "MIGRATION_RUNNER_DISABLED_LOCAL_REVIEW",
        field: "runnerStatus",
        message:
            "Migration runner is dry-run only for local review; Mission 169 does not execute live migrations.",
        severity: "info",
      }
      : {
        code: "MIGRATION_RUNNER_DEFERRED",
        field: "runnerStatus",
        message:
            "Live migration runner remains deferred until a protected production execution mission.",
        severity: "warning",
      };
  const issues = validateMigrationManifestStores(migrationStores);
  const runnerIssues = runnerPlan.validation.issues.map<MigrationDiagnostic>((issue) => ({
    code: issue.code,
    field: issue.field,
    message: issue.message,
    severity: issue.severity,
  }));
  const gateIssues = executionGate.diagnostics.map<MigrationDiagnostic>((issue) => ({
    code: issue.code,
    field: issue.field,
    message: issue.message,
    severity: issue.severity,
  }));
  const diagnostics = [runnerDiagnostic, ...runnerIssues, ...gateIssues, ...issues];
  const validationIssues = [...runnerIssues, ...gateIssues.filter((issue) => issue.severity === "error"), ...issues];

  return {
    diagnostics,
    executionGate,
    manifestVersion: "0.2.0",
    migrations: [...migrations],
    noDestructiveOperations: true,
    noLiveMigrationCommand: true,
    noMigrationRunner: false,
    runnerPlan,
    runnerStatus,
    stores: migrationStores,
    validation: {
      issues: validationIssues,
      valid: validationIssues.every((issue) => issue.severity !== "error"),
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
