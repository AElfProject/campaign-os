import { describe, expect, it } from "vitest";
import {
  createMigrationManifest,
  participantWalletAuthenticationMigration,
  postgresMigrationFileManifest,
  validateMigrationManifestStores,
  validatePostgresMigrationFileManifest,
  type MigrationStoreManifest,
} from "./migrationManifest";
import { defaultSchemaMigrations } from "./migrationRunner";

describe("migration manifest", () => {
  it("locks the participant wallet authentication migration identity, paths, and checksum", () => {
    expect(participantWalletAuthenticationMigration).toEqual({
      checksum: "d8d7dea2d7e8d4d0f8d195082cad72c01007dd28a63d2b97b27fa4584940db0c",
      downPath: "db/migrations/0005_participant_wallet_authentication.down.sql",
      id: "0005_participant_wallet_authentication",
      upPath: "db/migrations/0005_participant_wallet_authentication.up.sql",
    });
    expect(Object.isFrozen(participantWalletAuthenticationMigration)).toBe(true);
    expect(postgresMigrationFileManifest.map(({ id }) => id)).toEqual([
      "0001_campaign_runtime",
      "0002_admin_review_export",
      "0003_admin_review_rank_projection",
      "0004_live_provider_task_verification",
      "0005_participant_wallet_authentication",
    ]);
    expect(validatePostgresMigrationFileManifest(postgresMigrationFileManifest)).toEqual([]);
  });

  it.each([
    [
      "missing",
      postgresMigrationFileManifest.slice(0, -1),
      "POSTGRES_MIGRATION_MANIFEST_MISSING_ENTRY",
    ],
    [
      "duplicate",
      [...postgresMigrationFileManifest.slice(0, -1), postgresMigrationFileManifest[0]],
      "POSTGRES_MIGRATION_MANIFEST_DUPLICATE_ID",
    ],
    [
      "reordered",
      [
        postgresMigrationFileManifest[1],
        postgresMigrationFileManifest[0],
        ...postgresMigrationFileManifest.slice(2),
      ],
      "POSTGRES_MIGRATION_MANIFEST_ORDER_DRIFT",
    ],
    [
      "checksum drift",
      [
        ...postgresMigrationFileManifest.slice(0, -1),
        { ...participantWalletAuthenticationMigration, checksum: "0".repeat(64) },
      ],
      "POSTGRES_MIGRATION_MANIFEST_CHECKSUM_DRIFT",
    ],
  ] as const)("rejects %s deterministically", (_label, entries, expectedCode) => {
    expect(validatePostgresMigrationFileManifest(entries)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: expectedCode })]),
    );
  });

  it("creates a manifest-only local review readiness surface", () => {
    const manifest = createMigrationManifest();

    expect(manifest).toMatchObject({
      manifestVersion: "0.2.0",
      noDestructiveOperations: true,
      noLiveMigrationCommand: true,
      noMigrationRunner: false,
      runnerStatus: "disabled_local_review",
    });
    expect(manifest.manifestVersion).toBe("0.2.0");
    expect(manifest.runnerPlan).toMatchObject({
      dryRun: true,
      liveExecutionEnabled: false,
      status: "dry_run_ready",
    });
    expect(manifest.executionGate).toMatchObject({
      liveExecutionCount: 0,
      liveExecutionEnabled: false,
      mode: "dry_run_only",
      status: "ready",
    });
    expect(manifest.migrations.map((migration) => migration.id)).toEqual(
      defaultSchemaMigrations.map((migration) => migration.id),
    );
    expect(manifest.stores.map((store) => store.id)).toEqual([
      "campaign-db",
      "wallet-session-db",
      "task-evidence-db",
      "i18n-content-db",
      "risk-event-db",
      "points-ledger",
      "export-store",
      "analytics-warehouse",
      "contract-index",
    ]);
    expect(manifest.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MIGRATION_RUNNER_DISABLED_LOCAL_REVIEW",
          field: "runnerStatus",
          severity: "info",
        }),
      ]),
    );
    expect(manifest.validation.valid).toBe(true);
  });

  it("keeps migration runner deferred for production-required until a later mission", () => {
    const manifest = createMigrationManifest({ profileId: "production-required" });

    expect(manifest.runnerStatus).toBe("deferred");
    expect(manifest.noMigrationRunner).toBe(false);
    expect(manifest.runnerPlan.status).toBe("blocked");
    expect(manifest.executionGate).toMatchObject({
      approval: "missing",
      liveExecutionCount: 0,
      liveExecutionEnabled: false,
      mode: "live_blocked",
      status: "blocked",
    });
    expect(manifest.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MIGRATION_RUNNER_DEFERRED",
          severity: "warning",
        }),
      ]),
    );
  });

  it("requires migration stores to declare owners and production modes", () => {
    const malformedStore: MigrationStoreManifest = {
      currentMode: "deferred",
      id: "campaign-db",
      migrationRequired: true,
      ownerServiceId: "",
      productionMode: "" as MigrationStoreManifest["productionMode"],
      readiness: "blocked",
      targetSchemaVersion: "v0.2.0",
    };

    expect(validateMigrationManifestStores([malformedStore])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MIGRATION_STORE_MISSING_OWNER",
          field: "campaign-db",
          severity: "error",
        }),
        expect.objectContaining({
          code: "MIGRATION_STORE_MISSING_PRODUCTION_MODE",
          field: "campaign-db",
          severity: "error",
        }),
      ]),
    );
  });
});
