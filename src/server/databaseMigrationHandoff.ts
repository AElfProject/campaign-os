import type { BackendRuntimeProfileId } from "./backendProfiles";
import {
  createProductionDatabaseAdapterRuntimeContract,
  type ProductionDatabaseAdapterRuntimeContract,
} from "./databaseAdapterRuntime";
import type { MigrationExecutionGate } from "./migrationExecutionGate";

export type DatabaseMigrationExecutorStatus = "not_configured" | "deferred" | "blocked";
export type DatabaseMigrationHandoffDiagnosticCode =
  | "DATABASE_MIGRATION_GATE_BLOCKED"
  | "DATABASE_MIGRATION_EXECUTOR_NOT_CONFIGURED"
  | "DATABASE_MIGRATION_PRECONDITION_MISSING"
  | "DATABASE_MIGRATION_PRECONDITION_DEFERRED"
  | "DATABASE_MIGRATION_LIVE_EXECUTION_DISABLED";

export interface DatabaseMigrationHandoffDiagnostic {
  code: DatabaseMigrationHandoffDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface DatabaseMigrationHandoffPrecondition {
  id: string;
  required: boolean;
  source: "database-adapter-runtime" | "migration-execution-gate";
  status: "satisfied" | "missing" | "deferred" | "blocked";
}

export interface DatabaseMigrationExecutorHandoffSummary {
  adapterRuntimeId: ProductionDatabaseAdapterRuntimeContract["id"];
  diagnosticCodes: DatabaseMigrationHandoffDiagnosticCode[];
  diagnostics: DatabaseMigrationHandoffDiagnostic[];
  executorStatus: DatabaseMigrationExecutorStatus;
  id: "campaign-os-database-migration-executor-handoff";
  liveExecutionCount: 0;
  liveExecutionEnabled: false;
  migrationGateStatus: MigrationExecutionGate["status"];
  preconditions: DatabaseMigrationHandoffPrecondition[];
  profileId: BackendRuntimeProfileId;
  valid: boolean;
}

export interface CreateDatabaseMigrationExecutorHandoffOptions {
  adapterRuntime?: ProductionDatabaseAdapterRuntimeContract;
  migrationGate: MigrationExecutionGate;
  profileId?: BackendRuntimeProfileId;
}

const diagnostic = (
  code: DatabaseMigrationHandoffDiagnosticCode,
  field: string,
  message: string,
  severity: DatabaseMigrationHandoffDiagnostic["severity"] = "error",
): DatabaseMigrationHandoffDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const databaseRuntimePreconditionIds = [
  "driver-package-selected",
  "connection-pool-ready",
  "migration-lock-ready",
  "backup-restore-plan-ready",
  "secret-manager-ready",
  "explicit-live-migration-approval",
] as const;

const mapAdapterRuntimePreconditions = (
  adapterRuntime: ProductionDatabaseAdapterRuntimeContract,
): DatabaseMigrationHandoffPrecondition[] =>
  adapterRuntime.migrationExecutor.preconditions
    .filter((precondition) =>
      databaseRuntimePreconditionIds.some((requiredId) => requiredId === precondition.id),
    )
    .map((precondition) => ({
      id: precondition.id,
      required: precondition.required,
      source: "database-adapter-runtime",
      status: precondition.status,
    }));

const mapGatePreconditions = (
  migrationGate: MigrationExecutionGate,
): DatabaseMigrationHandoffPrecondition[] =>
  migrationGate.preconditions.map((precondition) => ({
    id: `migration-gate:${precondition.id}`,
    required: precondition.required,
    source: "migration-execution-gate",
    status: precondition.status,
  }));

const preconditionDiagnostics = (
  preconditions: readonly DatabaseMigrationHandoffPrecondition[],
): DatabaseMigrationHandoffDiagnostic[] =>
  preconditions
    .filter((precondition) => precondition.required && precondition.status !== "satisfied")
    .map((precondition) => {
      if (precondition.status === "missing") {
        return diagnostic(
          "DATABASE_MIGRATION_PRECONDITION_MISSING",
          precondition.id,
          `Database migration handoff precondition '${precondition.id}' is missing.`,
        );
      }

      return diagnostic(
        "DATABASE_MIGRATION_PRECONDITION_DEFERRED",
        precondition.id,
        `Database migration handoff precondition '${precondition.id}' is ${precondition.status}.`,
        precondition.status === "blocked" ? "error" : "warning",
      );
    });

export const createDatabaseMigrationExecutorHandoff = ({
  adapterRuntime,
  migrationGate,
  profileId = migrationGate.profileId,
}: CreateDatabaseMigrationExecutorHandoffOptions): DatabaseMigrationExecutorHandoffSummary => {
  const runtime = adapterRuntime
    ?? createProductionDatabaseAdapterRuntimeContract({ profileId });
  const preconditions = [
    ...mapAdapterRuntimePreconditions(runtime),
    ...mapGatePreconditions(migrationGate),
  ];
  const diagnostics: DatabaseMigrationHandoffDiagnostic[] = [
    ...(migrationGate.status === "blocked"
      ? [
        diagnostic(
          "DATABASE_MIGRATION_GATE_BLOCKED",
          "migrationGateStatus",
          "Migration execution gate is blocked; database migration executor handoff cannot proceed.",
        ),
      ]
      : []),
    diagnostic(
      "DATABASE_MIGRATION_LIVE_EXECUTION_DISABLED",
      "liveExecutionEnabled",
      "Database migration executor handoff is metadata-only; live execution remains disabled.",
      "info",
    ),
    ...preconditionDiagnostics(preconditions),
  ];
  const requiredIssue = preconditions.some(
    (precondition) => precondition.required && precondition.status !== "satisfied",
  );
  const executorStatus: DatabaseMigrationExecutorStatus =
    profileId === "production-required" || requiredIssue
      ? "blocked"
      : runtime.connectionPool.state === "configured_redacted"
        ? "deferred"
        : "not_configured";

  return {
    adapterRuntimeId: runtime.id,
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    executorStatus,
    id: "campaign-os-database-migration-executor-handoff",
    liveExecutionCount: 0,
    liveExecutionEnabled: false,
    migrationGateStatus: migrationGate.status,
    preconditions,
    profileId,
    valid: !diagnostics.some((item) => item.severity === "error"),
  };
};
