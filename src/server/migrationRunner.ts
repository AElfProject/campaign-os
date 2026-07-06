import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  productionDatabaseRequiredStoreIds,
  type ProductionDatabaseAdapterContract,
} from "./productionDatabase";
import type { BackendStoreId } from "./persistenceAdapterPort";

export type MigrationRunnerPlanStatus = "dry_run_ready" | "blocked";
export type MigrationDiagnosticCode =
  | "MIGRATION_CHECKSUM_MISMATCH"
  | "MIGRATION_DEPENDENCY_CYCLE"
  | "MIGRATION_DESTRUCTIVE_BLOCKED"
  | "MIGRATION_DUPLICATE_ID"
  | "MIGRATION_MISSING_CHECKSUM"
  | "MIGRATION_MISSING_DEPENDENCY"
  | "MIGRATION_UNKNOWN_STORE";

export interface MigrationRunnerDiagnostic {
  code: MigrationDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface SchemaMigrationDefinition {
  approvalRequired: boolean;
  checksum: string;
  dependsOn: string[];
  destructive: boolean;
  dryRunSupported: boolean;
  id: string;
  label: string;
  stores: BackendStoreId[];
}

export interface MigrationRunnerPlan {
  adapterId: ProductionDatabaseAdapterContract["id"];
  blockedMigrationIds: string[];
  diagnostics: MigrationRunnerDiagnostic[];
  dryRun: true;
  liveExecutionEnabled: false;
  pendingMigrationIds: string[];
  planId: string;
  profileId: BackendRuntimeProfileId;
  status: MigrationRunnerPlanStatus;
  validation: {
    issues: MigrationRunnerDiagnostic[];
    valid: boolean;
  };
}

export interface CreateMigrationRunnerPlanOptions {
  adapterId?: ProductionDatabaseAdapterContract["id"];
  expectedChecksums?: Record<string, string>;
  migrations?: readonly SchemaMigrationDefinition[];
  profileId?: BackendRuntimeProfileId;
}

export interface ValidateSchemaMigrationsOptions {
  expectedChecksums?: Record<string, string>;
  knownStoreIds?: readonly BackendStoreId[];
}

const migration = (
  definition: SchemaMigrationDefinition,
): SchemaMigrationDefinition => definition;

export const defaultSchemaMigrations = [
  migration({
    approvalRequired: false,
    checksum: "sha256:campaign-db-v0.2.0",
    dependsOn: [],
    destructive: false,
    dryRunSupported: true,
    id: "001-campaign-db-v0-2-0",
    label: "Create Campaign DB durable schema contract",
    stores: ["campaign-db"],
  }),
  migration({
    approvalRequired: false,
    checksum: "sha256:wallet-session-db-v0.2.0",
    dependsOn: ["001-campaign-db-v0-2-0"],
    destructive: false,
    dryRunSupported: true,
    id: "002-wallet-session-db-v0-2-0",
    label: "Create Wallet Session DB durable schema contract",
    stores: ["wallet-session-db"],
  }),
  migration({
    approvalRequired: false,
    checksum: "sha256:task-evidence-db-v0.2.0",
    dependsOn: ["001-campaign-db-v0-2-0", "002-wallet-session-db-v0-2-0"],
    destructive: false,
    dryRunSupported: true,
    id: "003-task-evidence-db-v0-2-0",
    label: "Create Task Evidence DB durable schema contract",
    stores: ["task-evidence-db"],
  }),
  migration({
    approvalRequired: false,
    checksum: "sha256:i18n-content-db-v0.2.0",
    dependsOn: ["001-campaign-db-v0-2-0"],
    destructive: false,
    dryRunSupported: true,
    id: "004-i18n-content-db-v0-2-0",
    label: "Create i18n Content DB durable schema contract",
    stores: ["i18n-content-db"],
  }),
  migration({
    approvalRequired: false,
    checksum: "sha256:risk-event-db-v0.2.0",
    dependsOn: ["001-campaign-db-v0-2-0", "002-wallet-session-db-v0-2-0"],
    destructive: false,
    dryRunSupported: true,
    id: "005-risk-event-db-v0-2-0",
    label: "Create Risk Event DB durable schema contract",
    stores: ["risk-event-db"],
  }),
  migration({
    approvalRequired: false,
    checksum: "sha256:points-ledger-v0.2.0",
    dependsOn: [
      "001-campaign-db-v0-2-0",
      "002-wallet-session-db-v0-2-0",
      "003-task-evidence-db-v0-2-0",
    ],
    destructive: false,
    dryRunSupported: true,
    id: "006-points-ledger-v0-2-0",
    label: "Create Points Ledger durable schema contract",
    stores: ["points-ledger"],
  }),
] as const satisfies readonly SchemaMigrationDefinition[];

const errorDiagnostic = (
  code: MigrationDiagnosticCode,
  field: string,
  message: string,
): MigrationRunnerDiagnostic => ({
  code,
  field,
  message,
  severity: "error",
});

const detectDependencyCycles = (
  migrations: readonly SchemaMigrationDefinition[],
): MigrationRunnerDiagnostic[] => {
  const byId = new Map(migrations.map((item) => [item.id, item]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const issues: MigrationRunnerDiagnostic[] = [];

  const visit = (id: string, path: string[]) => {
    if (visited.has(id)) {
      return;
    }

    if (visiting.has(id)) {
      issues.push(errorDiagnostic(
        "MIGRATION_DEPENDENCY_CYCLE",
        id,
        `Migration dependency cycle detected: ${[...path, id].join(" -> ")}.`,
      ));
      return;
    }

    const migrationDefinition = byId.get(id);

    if (!migrationDefinition) {
      return;
    }

    visiting.add(id);

    for (const dependencyId of migrationDefinition.dependsOn) {
      visit(dependencyId, [...path, id]);
    }

    visiting.delete(id);
    visited.add(id);
  };

  for (const migrationDefinition of migrations) {
    visit(migrationDefinition.id, []);
  }

  return issues;
};

export const validateSchemaMigrations = (
  migrations: readonly SchemaMigrationDefinition[],
  {
    expectedChecksums = {},
    knownStoreIds = productionDatabaseRequiredStoreIds,
  }: ValidateSchemaMigrationsOptions = {},
): MigrationRunnerDiagnostic[] => {
  const issues: MigrationRunnerDiagnostic[] = [];
  const ids = new Set<string>();
  const knownStores = new Set<BackendStoreId>(knownStoreIds);

  for (const migrationDefinition of migrations) {
    if (ids.has(migrationDefinition.id)) {
      issues.push(errorDiagnostic(
        "MIGRATION_DUPLICATE_ID",
        migrationDefinition.id,
        `Migration '${migrationDefinition.id}' is duplicated.`,
      ));
    }

    ids.add(migrationDefinition.id);

    if (!migrationDefinition.checksum) {
      issues.push(errorDiagnostic(
        "MIGRATION_MISSING_CHECKSUM",
        migrationDefinition.id,
        `Migration '${migrationDefinition.id}' is missing checksum.`,
      ));
    }

    const expectedChecksum = expectedChecksums[migrationDefinition.id];

    if (expectedChecksum && expectedChecksum !== migrationDefinition.checksum) {
      issues.push(errorDiagnostic(
        "MIGRATION_CHECKSUM_MISMATCH",
        migrationDefinition.id,
        `Migration '${migrationDefinition.id}' checksum does not match expected value.`,
      ));
    }

    for (const storeId of migrationDefinition.stores) {
      if (!knownStores.has(storeId)) {
        issues.push(errorDiagnostic(
          "MIGRATION_UNKNOWN_STORE",
          storeId,
          `Migration '${migrationDefinition.id}' references unknown store '${storeId}'.`,
        ));
      }
    }

    if (migrationDefinition.destructive && !migrationDefinition.approvalRequired) {
      issues.push(errorDiagnostic(
        "MIGRATION_DESTRUCTIVE_BLOCKED",
        migrationDefinition.id,
        `Migration '${migrationDefinition.id}' is destructive and lacks approval metadata.`,
      ));
    }
  }

  for (const migrationDefinition of migrations) {
    for (const dependencyId of migrationDefinition.dependsOn) {
      if (!ids.has(dependencyId)) {
        issues.push(errorDiagnostic(
          "MIGRATION_MISSING_DEPENDENCY",
          migrationDefinition.id,
          `Migration '${migrationDefinition.id}' depends on unknown migration '${dependencyId}'.`,
        ));
      }
    }
  }

  return [...issues, ...detectDependencyCycles(migrations)];
};

export const createMigrationRunnerPlan = ({
  adapterId = "campaign-os-production-db-adapter",
  expectedChecksums,
  migrations = defaultSchemaMigrations,
  profileId = "local-review",
}: CreateMigrationRunnerPlanOptions = {}): MigrationRunnerPlan => {
  const diagnostics = validateSchemaMigrations(migrations, { expectedChecksums });
  const validationValid = diagnostics.every((diagnostic) => diagnostic.severity !== "error");
  const status: MigrationRunnerPlanStatus =
    validationValid && profileId !== "production-required" ? "dry_run_ready" : "blocked";
  const blockedMigrationIds =
    status === "blocked" ? [...new Set(diagnostics.map((diagnostic) => diagnostic.field))] : [];

  return {
    adapterId,
    blockedMigrationIds,
    diagnostics,
    dryRun: true,
    liveExecutionEnabled: false,
    pendingMigrationIds: migrations.map((migrationDefinition) => migrationDefinition.id),
    planId: `migration-dry-run:${profileId}:v0.2.0`,
    profileId,
    status,
    validation: {
      issues: diagnostics,
      valid: validationValid,
    },
  };
};
