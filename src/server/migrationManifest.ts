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

export interface PostgresMigrationManifestEntry {
  readonly checksum: string;
  readonly downPath: string;
  readonly id: string;
  readonly upPath: string;
}

export type PostgresMigrationManifestIssueCode =
  | "POSTGRES_MIGRATION_MANIFEST_CHECKSUM_DRIFT"
  | "POSTGRES_MIGRATION_MANIFEST_DUPLICATE_ID"
  | "POSTGRES_MIGRATION_MANIFEST_MISSING_ENTRY"
  | "POSTGRES_MIGRATION_MANIFEST_ORDER_DRIFT"
  | "POSTGRES_MIGRATION_MANIFEST_PATH_DRIFT";

export interface PostgresMigrationManifestIssue {
  readonly code: PostgresMigrationManifestIssueCode;
  readonly field: string;
}

const postgresMigrationEntry = (
  entry: PostgresMigrationManifestEntry,
): Readonly<PostgresMigrationManifestEntry> => Object.freeze(entry);

export const postgresMigrationFileManifest = Object.freeze([
  postgresMigrationEntry({
    checksum: "f8987b38a916e3c53d533f6fdcd75bfe95e2ea766346b5786c998529435c75a4",
    downPath: "db/migrations/0001_campaign_runtime.down.sql",
    id: "0001_campaign_runtime",
    upPath: "db/migrations/0001_campaign_runtime.up.sql",
  }),
  postgresMigrationEntry({
    checksum: "4f8eb20ac83b52bc9bc3e842416ff09fce369ec64412b7d67b974f2c900e6af5",
    downPath: "db/migrations/0002_admin_review_export.down.sql",
    id: "0002_admin_review_export",
    upPath: "db/migrations/0002_admin_review_export.up.sql",
  }),
  postgresMigrationEntry({
    checksum: "c9236184b25820b36540942de86c2342c9098002a023db8da1f706cf287dd7e8",
    downPath: "db/migrations/0003_admin_review_rank_projection.down.sql",
    id: "0003_admin_review_rank_projection",
    upPath: "db/migrations/0003_admin_review_rank_projection.up.sql",
  }),
  postgresMigrationEntry({
    checksum: "8e772b6427b4e41f9fe0f13c0c355c2cfd94eb302ab4fd6bb036188f78130d63",
    downPath: "db/migrations/0004_live_provider_task_verification.down.sql",
    id: "0004_live_provider_task_verification",
    upPath: "db/migrations/0004_live_provider_task_verification.up.sql",
  }),
  postgresMigrationEntry({
    checksum: "724b928cbfb8dc8162663589db1bb0d136498f414223f64fdafa1d0da7470324",
    downPath: "db/migrations/0005_participant_wallet_authentication.down.sql",
    id: "0005_participant_wallet_authentication",
    upPath: "db/migrations/0005_participant_wallet_authentication.up.sql",
  }),
] as const);

export const participantWalletAuthenticationMigration =
  postgresMigrationFileManifest[postgresMigrationFileManifest.length - 1];

export const validatePostgresMigrationFileManifest = (
  entries: readonly PostgresMigrationManifestEntry[],
): PostgresMigrationManifestIssue[] => {
  const issues: PostgresMigrationManifestIssue[] = [];
  const observedIds = new Set<string>();

  for (const entry of entries) {
    if (observedIds.has(entry.id)) {
      issues.push({
        code: "POSTGRES_MIGRATION_MANIFEST_DUPLICATE_ID",
        field: entry.id,
      });
    }
    observedIds.add(entry.id);
  }

  for (const [index, expected] of postgresMigrationFileManifest.entries()) {
    const observed = entries[index];

    if (!observed) {
      issues.push({
        code: "POSTGRES_MIGRATION_MANIFEST_MISSING_ENTRY",
        field: expected.id,
      });
      continue;
    }
    if (observed.id !== expected.id) {
      issues.push({
        code: "POSTGRES_MIGRATION_MANIFEST_ORDER_DRIFT",
        field: expected.id,
      });
      continue;
    }
    if (observed.upPath !== expected.upPath || observed.downPath !== expected.downPath) {
      issues.push({
        code: "POSTGRES_MIGRATION_MANIFEST_PATH_DRIFT",
        field: expected.id,
      });
    }
    if (observed.checksum !== expected.checksum) {
      issues.push({
        code: "POSTGRES_MIGRATION_MANIFEST_CHECKSUM_DRIFT",
        field: expected.id,
      });
    }
  }

  if (entries.length > postgresMigrationFileManifest.length) {
    for (const extra of entries.slice(postgresMigrationFileManifest.length)) {
      issues.push({
        code: "POSTGRES_MIGRATION_MANIFEST_ORDER_DRIFT",
        field: extra.id,
      });
    }
  }

  return issues;
};

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
