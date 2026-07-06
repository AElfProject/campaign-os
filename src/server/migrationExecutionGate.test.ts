import { describe, expect, it } from "vitest";
import { createConnectionConfigSummary } from "./persistenceRuntime";
import { createMigrationRunnerPlan, defaultSchemaMigrations } from "./migrationRunner";
import { createMigrationExecutionGate } from "./migrationExecutionGate";

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

describe("migration execution gate", () => {
  it("keeps local review in dry-run-only mode with no live execution", () => {
    const gate = createMigrationExecutionGate({
      connection: createConnectionConfigSummary({ env: {}, profileId: "local-review" }),
      migrationPlan: createMigrationRunnerPlan({ profileId: "local-review" }),
      profileId: "local-review",
    });

    expect(gate).toMatchObject({
      approval: "not_required_for_dry_run",
      liveExecutionCount: 0,
      liveExecutionEnabled: false,
      mode: "dry_run_only",
      profileId: "local-review",
      status: "ready",
    });
    expect(gate.pendingMigrationIds).toEqual(defaultSchemaMigrations.map((migration) => migration.id));
  });

  it("blocks production-required without connection config, approval, and live preconditions", () => {
    const gate = createMigrationExecutionGate({
      connection: createConnectionConfigSummary({
        env: {},
        profileId: "production-required",
      }),
      migrationPlan: createMigrationRunnerPlan({ profileId: "production-required" }),
      profileId: "production-required",
    });

    expect(gate).toMatchObject({
      approval: "missing",
      liveExecutionCount: 0,
      liveExecutionEnabled: false,
      mode: "live_blocked",
      profileId: "production-required",
      status: "blocked",
    });
    expect(gate.preconditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "connection-config", status: "missing" }),
        expect.objectContaining({ id: "driver-package", status: "deferred" }),
        expect.objectContaining({ id: "migration-lock", status: "deferred" }),
        expect.objectContaining({ id: "backup-restore-plan", status: "deferred" }),
      ]),
    );
  });

  it("reports approved live migration as deferred, not executable, in Mission 172", () => {
    const gate = createMigrationExecutionGate({
      connection: createConnectionConfigSummary({
        env: {
          CAMPAIGN_OS_DATABASE_URL: "postgres://user:secret@db.internal/campaign",
        },
        profileId: "production-required",
      }),
      liveMigrationApproved: true,
      migrationPlan: createMigrationRunnerPlan({ profileId: "production-required" }),
      profileId: "production-required",
    });

    expect(gate).toMatchObject({
      approval: "approved",
      liveExecutionCount: 0,
      liveExecutionEnabled: false,
      mode: "live_approved_deferred",
      status: "blocked",
    });
    expect(gate.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MIGRATION_EXECUTION_LIVE_DEFERRED",
          severity: "warning",
        }),
      ]),
    );
  });

  it("does not leak connection strings in gate diagnostics", () => {
    const secret = "postgres://user:secret@db.internal/campaign";
    const gate = createMigrationExecutionGate({
      connection: createConnectionConfigSummary({
        env: {
          CAMPAIGN_OS_DATABASE_URL: secret,
        },
        profileId: "production-required",
      }),
      migrationPlan: createMigrationRunnerPlan({ profileId: "production-required" }),
      profileId: "production-required",
    });

    expect(collectStringValues(gate)).not.toContain(secret);
  });
});
