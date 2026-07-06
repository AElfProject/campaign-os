import type { BackendRuntimeProfileId } from "./backendProfiles";
import type { MigrationRunnerPlan } from "./migrationRunner";
import type { ConnectionConfigSummary, ProductionPersistenceRuntimeDiagnostic } from "./persistenceRuntime";
import { productionDatabaseSchemaManifest } from "./productionDatabase";

export type MigrationExecutionGateMode =
  | "dry_run_only"
  | "live_blocked"
  | "live_approved_deferred";
export type MigrationExecutionGateStatus = "ready" | "blocked";
export type MigrationExecutionApproval =
  | "not_required_for_dry_run"
  | "missing"
  | "approved";
export type MigrationExecutionPreconditionStatus =
  | "satisfied"
  | "missing"
  | "deferred"
  | "blocked";
export type MigrationRollbackPlanStatus = "not_required_for_dry_run" | "missing" | "ready";
export type MigrationExecutionGateDiagnosticCode =
  | "MIGRATION_EXECUTION_APPROVAL_MISSING"
  | "MIGRATION_EXECUTION_CONNECTION_MISSING"
  | "MIGRATION_EXECUTION_DRIVER_DEFERRED"
  | "MIGRATION_EXECUTION_LIVE_DEFERRED"
  | "MIGRATION_EXECUTION_PLAN_BLOCKED"
  | "MIGRATION_EXECUTION_PRECONDITION_MISSING"
  | "MIGRATION_EXECUTION_PRECONDITION_DEFERRED";

export interface MigrationExecutionGateDiagnostic {
  code: MigrationExecutionGateDiagnosticCode;
  field: string;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface MigrationExecutionPrecondition {
  id: string;
  required: boolean;
  status: MigrationExecutionPreconditionStatus;
}

export interface MigrationExecutionGate {
  adapterId: string;
  approval: MigrationExecutionApproval;
  blockedMigrationIds: string[];
  diagnostics: MigrationExecutionGateDiagnostic[];
  liveExecutionCount: 0;
  liveExecutionEnabled: false;
  mode: MigrationExecutionGateMode;
  pendingMigrationIds: string[];
  preconditions: MigrationExecutionPrecondition[];
  profileId: BackendRuntimeProfileId;
  rollbackPlan: {
    required: boolean;
    status: MigrationRollbackPlanStatus;
  };
  schemaManifestId: typeof productionDatabaseSchemaManifest.id;
  status: MigrationExecutionGateStatus;
}

export interface CreateMigrationExecutionGateOptions {
  adapterId?: string;
  connection: ConnectionConfigSummary;
  liveMigrationApproved?: boolean;
  migrationPlan: MigrationRunnerPlan;
  profileId?: BackendRuntimeProfileId;
}

const diagnostic = (
  code: MigrationExecutionGateDiagnosticCode,
  field: string,
  message: string,
  severity: MigrationExecutionGateDiagnostic["severity"] = "error",
): MigrationExecutionGateDiagnostic => ({
  code,
  field,
  message,
  severity,
});

const hasConnectionConfig = (connection: ConnectionConfigSummary) =>
  connection.state === "configured_redacted" && connection.missingKeys.length === 0;

const mapRuntimeDiagnostics = (
  diagnostics: readonly ProductionPersistenceRuntimeDiagnostic[],
): MigrationExecutionGateDiagnostic[] =>
  diagnostics
    .filter((item) => item.severity === "error")
    .map((item) =>
      diagnostic(
        item.code === "PRODUCTION_PERSISTENCE_CONFIG_REQUIRED"
          ? "MIGRATION_EXECUTION_CONNECTION_MISSING"
          : "MIGRATION_EXECUTION_PRECONDITION_DEFERRED",
        item.field,
        item.message,
        item.severity,
      ),
    );

const createPreconditions = ({
  connection,
  liveMigrationApproved,
  profileId,
}: {
  connection: ConnectionConfigSummary;
  liveMigrationApproved: boolean;
  profileId: BackendRuntimeProfileId;
}): MigrationExecutionPrecondition[] => {
  const connectionRequired = profileId === "production-required";
  const connectionStatus: MigrationExecutionPreconditionStatus =
    !connectionRequired || hasConnectionConfig(connection) ? "satisfied" : "missing";
  const rollbackRequired = profileId === "production-required";

  return [
    {
      id: "schema-manifest-compatible",
      required: true,
      status: "satisfied",
    },
    {
      id: "connection-config",
      required: connectionRequired,
      status: connectionStatus,
    },
    {
      id: "migration-approval",
      required: profileId === "production-required",
      status:
        profileId === "production-required" && !liveMigrationApproved
          ? "missing"
          : "satisfied",
    },
    {
      id: "rollback-plan",
      required: rollbackRequired,
      status: rollbackRequired ? "missing" : "satisfied",
    },
    {
      id: "driver-package",
      required: profileId === "production-required",
      status: profileId === "production-required" ? "deferred" : "satisfied",
    },
    {
      id: "migration-lock",
      required: profileId === "production-required",
      status: profileId === "production-required" ? "deferred" : "satisfied",
    },
    {
      id: "backup-restore-plan",
      required: profileId === "production-required",
      status: profileId === "production-required" ? "deferred" : "satisfied",
    },
  ];
};

export const createMigrationExecutionGate = ({
  adapterId,
  connection,
  liveMigrationApproved = false,
  migrationPlan,
  profileId = "local-review",
}: CreateMigrationExecutionGateOptions): MigrationExecutionGate => {
  const resolvedAdapterId = adapterId ?? migrationPlan.adapterId;
  const approval: MigrationExecutionApproval =
    profileId === "production-required"
      ? liveMigrationApproved
        ? "approved"
        : "missing"
      : "not_required_for_dry_run";
  const mode: MigrationExecutionGateMode =
    profileId !== "production-required"
      ? "dry_run_only"
      : liveMigrationApproved
        ? "live_approved_deferred"
        : "live_blocked";
  const preconditions = createPreconditions({ connection, liveMigrationApproved, profileId });
  const rollbackPlan: MigrationExecutionGate["rollbackPlan"] =
    profileId === "production-required"
      ? {
        required: true,
        status: "missing",
      }
      : {
        required: false,
        status: "not_required_for_dry_run",
      };
  const diagnostics: MigrationExecutionGateDiagnostic[] = [
    ...mapRuntimeDiagnostics(connection.diagnostics),
    ...migrationPlan.diagnostics.map((item) =>
      diagnostic("MIGRATION_EXECUTION_PLAN_BLOCKED", item.field, item.message, item.severity),
    ),
  ];

  if (approval === "missing") {
    diagnostics.push(
      diagnostic(
        "MIGRATION_EXECUTION_APPROVAL_MISSING",
        "approval",
        "Live migration execution requires explicit approval in production-required profile.",
      ),
    );
  }

  for (const precondition of preconditions) {
    if (precondition.required && precondition.status === "missing") {
      diagnostics.push(
        diagnostic(
          "MIGRATION_EXECUTION_PRECONDITION_MISSING",
          precondition.id,
          `Migration execution precondition '${precondition.id}' is missing.`,
        ),
      );
    }

    if (precondition.required && precondition.status === "deferred") {
      diagnostics.push(
        diagnostic(
          precondition.id === "driver-package"
            ? "MIGRATION_EXECUTION_DRIVER_DEFERRED"
            : "MIGRATION_EXECUTION_PRECONDITION_DEFERRED",
          precondition.id,
          `Migration execution precondition '${precondition.id}' is deferred in Mission 172.`,
          "warning",
        ),
      );
    }
  }

  if (mode === "live_approved_deferred") {
    diagnostics.push(
      diagnostic(
        "MIGRATION_EXECUTION_LIVE_DEFERRED",
        "liveExecutionEnabled",
        "Live migration approval is present, but execution remains deferred until driver, lock, and backup readiness exist.",
        "warning",
      ),
    );
  }

  const blockingDiagnostics = diagnostics.filter((item) => item.severity === "error");
  const hasDeferredRequiredPreconditions = preconditions.some(
    (item) => item.required && item.status !== "satisfied",
  );
  const status: MigrationExecutionGateStatus =
    profileId === "production-required" || blockingDiagnostics.length > 0 || hasDeferredRequiredPreconditions
      ? "blocked"
      : "ready";

  return {
    adapterId: resolvedAdapterId,
    approval,
    blockedMigrationIds: [
      ...migrationPlan.blockedMigrationIds,
      ...preconditions
        .filter((item) => item.required && item.status !== "satisfied")
        .map((item) => item.id),
    ],
    diagnostics,
    liveExecutionCount: 0,
    liveExecutionEnabled: false,
    mode,
    pendingMigrationIds: [...migrationPlan.pendingMigrationIds],
    preconditions,
    profileId,
    rollbackPlan,
    schemaManifestId: productionDatabaseSchemaManifest.id,
    status,
  };
};
