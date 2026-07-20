import { describe, expect, it } from "vitest";
import {
  createMigrationManifest,
  durableTaskTemplateCatalogMigration,
  participantWalletAuthenticationMigration,
  postgresMigrationFileManifest,
  validateMigrationManifestStores,
  validatePostgresMigrationFileManifest,
  type MigrationStoreManifest,
} from "./migrationManifest";
import { defaultSchemaMigrations } from "./migrationRunner";

describe("migration manifest", () => {
  it("locks the existing migration identities, paths, and checksums before appending 0006", () => {
    expect(participantWalletAuthenticationMigration).toEqual({
      checksum: "d8d7dea2d7e8d4d0f8d195082cad72c01007dd28a63d2b97b27fa4584940db0c",
      downPath: "db/migrations/0005_participant_wallet_authentication.down.sql",
      id: "0005_participant_wallet_authentication",
      upPath: "db/migrations/0005_participant_wallet_authentication.up.sql",
    });
    expect(Object.isFrozen(participantWalletAuthenticationMigration)).toBe(true);
    expect(postgresMigrationFileManifest.slice(0, 5)).toEqual([
      {
        checksum: "f8987b38a916e3c53d533f6fdcd75bfe95e2ea766346b5786c998529435c75a4",
        downPath: "db/migrations/0001_campaign_runtime.down.sql",
        id: "0001_campaign_runtime",
        upPath: "db/migrations/0001_campaign_runtime.up.sql",
      },
      {
        checksum: "4f8eb20ac83b52bc9bc3e842416ff09fce369ec64412b7d67b974f2c900e6af5",
        downPath: "db/migrations/0002_admin_review_export.down.sql",
        id: "0002_admin_review_export",
        upPath: "db/migrations/0002_admin_review_export.up.sql",
      },
      {
        checksum: "c9236184b25820b36540942de86c2342c9098002a023db8da1f706cf287dd7e8",
        downPath: "db/migrations/0003_admin_review_rank_projection.down.sql",
        id: "0003_admin_review_rank_projection",
        upPath: "db/migrations/0003_admin_review_rank_projection.up.sql",
      },
      {
        checksum: "8e772b6427b4e41f9fe0f13c0c355c2cfd94eb302ab4fd6bb036188f78130d63",
        downPath: "db/migrations/0004_live_provider_task_verification.down.sql",
        id: "0004_live_provider_task_verification",
        upPath: "db/migrations/0004_live_provider_task_verification.up.sql",
      },
      {
        checksum: "d8d7dea2d7e8d4d0f8d195082cad72c01007dd28a63d2b97b27fa4584940db0c",
        downPath: "db/migrations/0005_participant_wallet_authentication.down.sql",
        id: "0005_participant_wallet_authentication",
        upPath: "db/migrations/0005_participant_wallet_authentication.up.sql",
      },
    ]);
    expect(postgresMigrationFileManifest.map(({ id }) => id)).toEqual([
      "0001_campaign_runtime",
      "0002_admin_review_export",
      "0003_admin_review_rank_projection",
      "0004_live_provider_task_verification",
      "0005_participant_wallet_authentication",
      "0006_durable_task_template_catalog",
    ]);
    expect(postgresMigrationFileManifest[5]).toMatchObject({
      checksum: "421d5944d5203c419d5967e80399134237aad897cef9da184eed5c17066cd0de",
      downPath: "db/migrations/0006_durable_task_template_catalog.down.sql",
      id: "0006_durable_task_template_catalog",
      upPath: "db/migrations/0006_durable_task_template_catalog.up.sql",
    });
    expect(durableTaskTemplateCatalogMigration).toBe(postgresMigrationFileManifest[5]);
    expect(Object.isFrozen(durableTaskTemplateCatalogMigration)).toBe(true);
    expect(validatePostgresMigrationFileManifest(postgresMigrationFileManifest)).toEqual([]);
  });

  it.each([
    [
      "missing",
      postgresMigrationFileManifest.slice(0, -1),
      "POSTGRES_MIGRATION_MANIFEST_MISSING_ENTRY",
    ],
    [
      "extra",
      [
        ...postgresMigrationFileManifest,
        {
          checksum: "0".repeat(64),
          downPath: "db/migrations/0007_unexpected.down.sql",
          id: "0007_unexpected",
          upPath: "db/migrations/0007_unexpected.up.sql",
        },
      ],
      "POSTGRES_MIGRATION_MANIFEST_EXTRA_ENTRY",
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
        { ...postgresMigrationFileManifest[5], checksum: "0".repeat(64) },
      ],
      "POSTGRES_MIGRATION_MANIFEST_CHECKSUM_DRIFT",
    ],
    [
      "up path drift",
      [
        ...postgresMigrationFileManifest.slice(0, -1),
        { ...postgresMigrationFileManifest[5], upPath: "db/migrations/wrong.up.sql" },
      ],
      "POSTGRES_MIGRATION_MANIFEST_PATH_DRIFT",
    ],
    [
      "down path drift",
      [
        ...postgresMigrationFileManifest.slice(0, -1),
        { ...postgresMigrationFileManifest[5], downPath: "db/migrations/wrong.down.sql" },
      ],
      "POSTGRES_MIGRATION_MANIFEST_PATH_DRIFT",
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
