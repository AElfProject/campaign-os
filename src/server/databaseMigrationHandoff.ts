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
  approvalStatus: MigrationExecutionGate["approval"];
  blockedMigrationIds: string[];
  diagnosticCodes: DatabaseMigrationHandoffDiagnosticCode[];
  diagnostics: DatabaseMigrationHandoffDiagnostic[];
  executorStatus: DatabaseMigrationExecutorStatus;
  id: "campaign-os-database-migration-executor-handoff";
  liveExecutionCount: 0;
  liveExecutionEnabled: false;
  migrationGateStatus: MigrationExecutionGate["status"];
  pendingMigrationIds: string[];
  preconditions: DatabaseMigrationHandoffPrecondition[];
  profileId: BackendRuntimeProfileId;
  requiredPreconditionIds: string[];
  rollbackReadiness: {
    blockers: string[];
    planId: "campaign-os-production-db-rollback-v0.2";
    ready: boolean;
    status: "ready_for_dry_run" | "missing_for_live";
  };
  rollbackPlanStatus: MigrationExecutionGate["rollbackPlan"]["status"];
  schemaManifestId: MigrationExecutionGate["schemaManifestId"];
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

const createRollbackReadiness = (
  preconditions: readonly DatabaseMigrationHandoffPrecondition[],
  profileId: BackendRuntimeProfileId,
): DatabaseMigrationExecutorHandoffSummary["rollbackReadiness"] => {
  if (profileId !== "production-required") {
    return {
      blockers: [],
      planId: "campaign-os-production-db-rollback-v0.2",
      ready: true,
      status: "ready_for_dry_run",
    };
  }

  const rollbackBlockers = preconditions
    .filter((precondition) =>
      precondition.required
      && precondition.status !== "satisfied"
      && (
        precondition.id === "backup-restore-plan-ready"
        || precondition.id === "migration-gate:rollback-plan"
      ),
    )
    .map((precondition) => precondition.id);

  return {
    blockers: rollbackBlockers,
    planId: "campaign-os-production-db-rollback-v0.2",
    ready: rollbackBlockers.length === 0,
    status: rollbackBlockers.length === 0 ? "ready_for_dry_run" : "missing_for_live",
  };
};

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
  const requiredPreconditionIds = preconditions
    .filter((precondition) => precondition.required)
    .map((precondition) => precondition.id);
  const rollbackReadiness = createRollbackReadiness(preconditions, profileId);
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
    approvalStatus: migrationGate.approval,
    blockedMigrationIds: [...migrationGate.blockedMigrationIds],
    diagnosticCodes: diagnostics.map((item) => item.code),
    diagnostics,
    executorStatus,
    id: "campaign-os-database-migration-executor-handoff",
    liveExecutionCount: 0,
    liveExecutionEnabled: false,
    migrationGateStatus: migrationGate.status,
    pendingMigrationIds: [...migrationGate.pendingMigrationIds],
    preconditions,
    profileId,
    requiredPreconditionIds,
    rollbackReadiness,
    rollbackPlanStatus: migrationGate.rollbackPlan.status,
    schemaManifestId: migrationGate.schemaManifestId,
    valid: !diagnostics.some((item) => item.severity === "error"),
  };
};
