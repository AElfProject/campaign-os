import { describe, expect, it } from "vitest";
import {
  createMigrationRunnerPlan,
  defaultSchemaMigrations,
  validateSchemaMigrations,
  type SchemaMigrationDefinition,
} from "./migrationRunner";
import { productionDatabaseRequiredStoreIds } from "./productionDatabase";

describe("migration runner dry-run validation", () => {
  it("defines default dry-run migrations for the six required stores", () => {
    const coveredStores = new Set(defaultSchemaMigrations.flatMap((migration) => migration.stores));

    expect([...coveredStores]).toEqual(productionDatabaseRequiredStoreIds);
    expect(defaultSchemaMigrations.every((migration) => migration.dryRunSupported)).toBe(true);
    expect(defaultSchemaMigrations.every((migration) => !migration.destructive)).toBe(true);
  });

  it("creates a deterministic local review dry-run plan without live execution", () => {
    const plan = createMigrationRunnerPlan({ profileId: "local-review" });

    expect(plan).toMatchObject({
      adapterId: "campaign-os-production-db-adapter",
      dryRun: true,
      liveExecutionEnabled: false,
      profileId: "local-review",
      status: "dry_run_ready",
    });
    expect(plan.pendingMigrationIds).toEqual(defaultSchemaMigrations.map((migration) => migration.id));
    expect(plan.validation.valid).toBe(true);
  });

  it("rejects duplicate migration ids", () => {
    const duplicate = [defaultSchemaMigrations[0], defaultSchemaMigrations[0]];

    expect(validateSchemaMigrations(duplicate)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MIGRATION_DUPLICATE_ID",
          severity: "error",
        }),
      ]),
    );
  });

  it("rejects missing dependencies, dependency cycles, unknown stores, missing checksums, and blocked destructive changes", () => {
    const invalidMigrations: SchemaMigrationDefinition[] = [
      {
        approvalRequired: false,
        checksum: "",
        dependsOn: ["missing-migration"],
        destructive: false,
        dryRunSupported: true,
        id: "001-invalid-foundation",
        label: "Invalid foundation",
        stores: ["unknown-store" as SchemaMigrationDefinition["stores"][number]],
      },
      {
        approvalRequired: false,
        checksum: "sha256:cycle-a",
        dependsOn: ["003-cycle-b"],
        destructive: false,
        dryRunSupported: true,
        id: "002-cycle-a",
        label: "Cycle A",
        stores: ["campaign-db"],
      },
      {
        approvalRequired: false,
        checksum: "sha256:cycle-b",
        dependsOn: ["002-cycle-a"],
        destructive: false,
        dryRunSupported: true,
        id: "003-cycle-b",
        label: "Cycle B",
        stores: ["campaign-db"],
      },
      {
        approvalRequired: false,
        checksum: "sha256:destructive",
        dependsOn: [],
        destructive: true,
        dryRunSupported: true,
        id: "004-destructive",
        label: "Destructive change",
        stores: ["campaign-db"],
      },
    ];

    expect(validateSchemaMigrations(invalidMigrations)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "MIGRATION_MISSING_DEPENDENCY" }),
        expect.objectContaining({ code: "MIGRATION_DEPENDENCY_CYCLE" }),
        expect.objectContaining({ code: "MIGRATION_UNKNOWN_STORE" }),
        expect.objectContaining({ code: "MIGRATION_MISSING_CHECKSUM" }),
        expect.objectContaining({ code: "MIGRATION_DESTRUCTIVE_BLOCKED" }),
      ]),
    );
  });

  it("reports checksum mismatches when expected checksums are supplied", () => {
    expect(
      validateSchemaMigrations(defaultSchemaMigrations, {
        expectedChecksums: {
          [defaultSchemaMigrations[0].id]: "sha256:unexpected",
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MIGRATION_CHECKSUM_MISMATCH",
          field: defaultSchemaMigrations[0].id,
          severity: "error",
        }),
      ]),
    );
  });
});
