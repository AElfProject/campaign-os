import { describe, expect, it } from "vitest";
import { createProductionDatabaseAdapterRuntimeContract } from "./databaseAdapterRuntime";
import { createDatabaseMigrationExecutorHandoff } from "./databaseMigrationHandoff";
import { createMigrationExecutionGate } from "./migrationExecutionGate";
import { createMigrationRunnerPlan } from "./migrationRunner";
import { createConnectionConfigSummary } from "./persistenceRuntime";

const collectStringValues = (value: unknown, values: string[] = []): string[] => {
  if (typeof value === "string") {
    values.push(value);
    return values;
  }

  if (!value || typeof value !== "object") {
    return values;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, values);
    }

    return values;
  }

  for (const nestedValue of Object.values(value)) {
    collectStringValues(nestedValue, values);
  }

  return values;
};

describe("database migration executor handoff", () => {
  it("keeps local review as metadata-only with no live execution", () => {
    const migrationGate = createMigrationExecutionGate({
      connection: createConnectionConfigSummary({ env: {}, profileId: "local-review" }),
      migrationPlan: createMigrationRunnerPlan({ profileId: "local-review" }),
      profileId: "local-review",
    });
    const handoff = createDatabaseMigrationExecutorHandoff({ migrationGate });

    expect(handoff).toMatchObject({
      approvalStatus: "not_required_for_dry_run",
      executorStatus: "not_configured",
      id: "campaign-os-database-migration-executor-handoff",
      liveExecutionCount: 0,
      liveExecutionEnabled: false,
      migrationGateStatus: "ready",
      profileId: "local-review",
      requiredPreconditionIds: ["migration-gate:schema-manifest-compatible"],
      rollbackPlanStatus: "not_required_for_dry_run",
      rollbackReadiness: {
        planId: "campaign-os-production-db-rollback-v0.2",
        ready: true,
        status: "ready_for_dry_run",
      },
      schemaManifestId: "campaign-os-production-db-schema-v0.2",
      valid: true,
    });
    expect(handoff.pendingMigrationIds).toEqual(
      createMigrationRunnerPlan({ profileId: "local-review" }).pendingMigrationIds,
    );
    expect(handoff.diagnosticCodes).toContain("DATABASE_MIGRATION_LIVE_EXECUTION_DISABLED");
  });

  it("blocks production-required handoff on missing adapter and gate preconditions", () => {
    const adapterRuntime = createProductionDatabaseAdapterRuntimeContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
    });
    const migrationGate = createMigrationExecutionGate({
      connection: createConnectionConfigSummary({ env: {}, profileId: "production-required" }),
      migrationPlan: createMigrationRunnerPlan({ profileId: "production-required" }),
      profileId: "production-required",
    });
    const handoff = createDatabaseMigrationExecutorHandoff({
      adapterRuntime,
      migrationGate,
    });

    expect(handoff).toMatchObject({
      approvalStatus: "missing",
      executorStatus: "blocked",
      liveExecutionCount: 0,
      liveExecutionEnabled: false,
      migrationGateStatus: "blocked",
      profileId: "production-required",
      requiredPreconditionIds: expect.arrayContaining([
        "driver-package-selected",
        "connection-pool-ready",
        "migration-lock-ready",
        "backup-restore-plan-ready",
        "secret-manager-ready",
        "explicit-live-migration-approval",
        "migration-gate:migration-approval",
        "migration-gate:rollback-plan",
        "migration-gate:driver-package",
        "migration-gate:migration-lock",
        "migration-gate:backup-restore-plan",
      ]),
      rollbackPlanStatus: "missing",
      rollbackReadiness: {
        blockers: expect.arrayContaining([
          "migration-gate:rollback-plan",
          "backup-restore-plan-ready",
        ]),
        planId: "campaign-os-production-db-rollback-v0.2",
        ready: false,
        status: "missing_for_live",
      },
      schemaManifestId: "campaign-os-production-db-schema-v0.2",
      valid: false,
    });
    expect(handoff.preconditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "connection-pool-ready",
          source: "database-adapter-runtime",
          status: "missing",
        }),
        expect.objectContaining({
          id: "secret-manager-ready",
          source: "database-adapter-runtime",
          status: "deferred",
        }),
        expect.objectContaining({
          id: "migration-gate:migration-approval",
          source: "migration-execution-gate",
          status: "missing",
        }),
        expect.objectContaining({
          id: "migration-gate:rollback-plan",
          source: "migration-execution-gate",
          status: "missing",
        }),
      ]),
    );
    expect(handoff.blockedMigrationIds).toEqual(
      expect.arrayContaining(["connection-config", "migration-approval", "rollback-plan"]),
    );
    expect(handoff.diagnosticCodes).toEqual(
      expect.arrayContaining([
        "DATABASE_MIGRATION_GATE_BLOCKED",
        "DATABASE_MIGRATION_PRECONDITION_MISSING",
        "DATABASE_MIGRATION_PRECONDITION_DEFERRED",
      ]),
    );
  });

  it("keeps live approval deferred when driver lock and backup readiness are missing", () => {
    const env = {
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_DATABASE_URL: "postgres://user:secret@db.internal/campaign",
    };
    const adapterRuntime = createProductionDatabaseAdapterRuntimeContract({ env });
    const migrationGate = createMigrationExecutionGate({
      connection: createConnectionConfigSummary({ env, profileId: "production-required" }),
      liveMigrationApproved: true,
      migrationPlan: createMigrationRunnerPlan({ profileId: "production-required" }),
      profileId: "production-required",
    });
    const handoff = createDatabaseMigrationExecutorHandoff({
      adapterRuntime,
      migrationGate,
    });

    expect(handoff).toMatchObject({
      executorStatus: "blocked",
      liveExecutionCount: 0,
      liveExecutionEnabled: false,
      migrationGateStatus: "blocked",
    });
    expect(handoff.rollbackReadiness).toMatchObject({
      blockers: expect.arrayContaining([
        "migration-gate:rollback-plan",
        "backup-restore-plan-ready",
      ]),
      ready: false,
      status: "missing_for_live",
    });
    expect(handoff.preconditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "connection-pool-ready", status: "satisfied" }),
        expect.objectContaining({ id: "driver-package-selected", status: "deferred" }),
        expect.objectContaining({ id: "migration-lock-ready", status: "deferred" }),
        expect.objectContaining({ id: "backup-restore-plan-ready", status: "deferred" }),
      ]),
    );
  });

  it("does not leak secret connection strings in serialized handoff metadata", () => {
    const secret = "postgres://user:secret@db.internal/campaign";
    const env = {
      CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      CAMPAIGN_OS_DATABASE_URL: secret,
    };
    const adapterRuntime = createProductionDatabaseAdapterRuntimeContract({ env });
    const migrationGate = createMigrationExecutionGate({
      connection: createConnectionConfigSummary({ env, profileId: "production-required" }),
      migrationPlan: createMigrationRunnerPlan({ profileId: "production-required" }),
      profileId: "production-required",
    });
    const handoff = createDatabaseMigrationExecutorHandoff({
      adapterRuntime,
      migrationGate,
    });

    expect(collectStringValues(handoff)).not.toContain(secret);
  });
});
