import { describe, expect, it } from "vitest";
import {
  createProductionDatabaseAdapterRuntimeContract,
  databaseAdapterDeferredDependencies,
} from "./databaseAdapterRuntime";
import { productionDatabaseRequiredStoreIds } from "./productionDatabase";

describe("production database adapter runtime", () => {
  it("resolves local review as a deterministic offline runtime boundary", () => {
    const contract = createProductionDatabaseAdapterRuntimeContract({ env: {} });

    expect(contract).toMatchObject({
      driverId: "campaign-os-deterministic-test-driver",
      id: "campaign-os-production-database-adapter-runtime",
      liveConnectionAttempted: false,
      liveQueryExecutionEnabled: false,
      profileId: "local-review",
      providerId: "campaign-os-deterministic-test-db",
      status: "active_local",
      valid: true,
    });
    expect(contract.productionDbRuntime).toMatchObject({
      connection: expect.objectContaining({
        liveConnectionAttempted: false,
        safeLabel: "deterministic_fixture",
        state: "ready",
      }),
      driver: expect.objectContaining({
        deterministicFixture: true,
        productionReady: false,
      }),
      id: "campaign-os-production-db-runtime-v1",
      liveConnectionAttempted: false,
      liveQueryExecutionEnabled: false,
      migrationGate: expect.objectContaining({
        liveExecutionEnabled: false,
        status: "not_required_for_fixture",
      }),
      ownerStores: productionDatabaseRequiredStoreIds,
      queryCapability: expect.objectContaining({
        adHocRawSqlEnabled: false,
        liveQueryExecutionEnabled: false,
        parameterizedQueries: true,
        transactions: true,
      }),
      schemaManifestId: "campaign-os-production-db-schema-v0.2",
      status: "ready",
      valid: true,
    });
    expect(contract.connectionPool).toMatchObject({
      liveConnectionAttempted: false,
      missingKeys: [],
      state: "not_configured",
    });
    expect(contract.queryAdapter).toMatchObject({
      deterministicTestMode: true,
      liveQueryExecutionEnabled: false,
      supportedStoreIds: productionDatabaseRequiredStoreIds,
    });
    expect(contract.packageBinding).toMatchObject({
      bindingId: "campaign-os-postgresql-package-binding-local",
      blockerCount: 0,
      liveConnectionAttempted: false,
      liveMigrationExecutionEnabled: false,
      liveQueryExecutionEnabled: false,
      liveTransactionExecutionEnabled: false,
      packageName: "pg",
      packageRef: "npm:pg",
      productionReady: false,
      status: "local_ready",
      valid: true,
    });
    expect(contract.packageBinding.requiredStoreIds).toEqual(productionDatabaseRequiredStoreIds);
    expect(contract.transaction).toMatchObject({
      eventCaptureSupported: true,
      liveCommitEnabled: false,
      mode: "deterministic_test",
      supported: true,
    });
    expect(contract.migrationExecutor).toMatchObject({
      executorStatus: "not_configured",
      liveExecutionCount: 0,
      liveExecutionEnabled: false,
    });
  });

  it("fails closed for production-required when database adapter preconditions are missing", () => {
    const contract = createProductionDatabaseAdapterRuntimeContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
    });

    expect(contract.valid).toBe(false);
    expect(contract.status).toBe("blocked");
    expect(contract.providerId).toBe("campaign-os-provider-deferred");
    expect(contract.driverId).toBe("campaign-os-production-driver-deferred");
    expect(contract.connectionPool).toMatchObject({
      missingKeys: ["CAMPAIGN_OS_DATABASE_URL"],
      state: "blocked",
    });
    expect(contract.migrationExecutor).toMatchObject({
      executorStatus: "blocked",
      liveExecutionCount: 0,
      liveExecutionEnabled: false,
    });
    expect(contract.productionDbRuntime).toMatchObject({
      connection: expect.objectContaining({
        liveConnectionAttempted: false,
        missingConfigKeys: ["CAMPAIGN_OS_DATABASE_URL"],
        state: "blocked",
      }),
      driver: expect.objectContaining({
        deterministicFixture: false,
        productionReady: false,
      }),
      liveConnectionAttempted: false,
      liveQueryExecutionEnabled: false,
      migrationGate: expect.objectContaining({
        approvalRequired: true,
        liveExecutionEnabled: false,
        status: "blocked",
      }),
      profileId: "production-required",
      status: "blocked",
      valid: false,
    });
    expect(contract.packageBinding).toMatchObject({
      bindingId: "campaign-os-postgresql-package-binding-production",
      blockerCount: 11,
      diagnosticCodes: expect.arrayContaining([
        "PRODUCTION_DB_PACKAGE_REFERENCE_MISSING",
        "PRODUCTION_DB_PROVIDER_SELECTION_MISSING",
        "PRODUCTION_DB_CONNECTION_REFERENCE_MISSING",
        "PRODUCTION_DB_LIVE_ENABLEMENT_MISSING",
      ]),
      liveConnectionAttempted: false,
      liveProviderCallsEnabled: false,
      liveQueryExecutionEnabled: false,
      packageName: "pg",
      packageRef: "npm:pg",
      productionReady: false,
      status: "blocked",
      valid: false,
    });
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DATABASE_ADAPTER_CONFIG_REQUIRED",
          field: "CAMPAIGN_OS_DATABASE_URL",
          severity: "error",
        }),
        expect.objectContaining({
          code: "DATABASE_DRIVER_PRODUCTION_DEFERRED",
          severity: "error",
        }),
        expect.objectContaining({
          code: "DATABASE_ADAPTER_PRECONDITION_DEFERRED",
          field: "secret-manager",
          severity: "error",
        }),
        expect.objectContaining({
          code: "PRODUCTION_DB_PACKAGE_REFERENCE_MISSING",
          field: "CAMPAIGN_OS_DATABASE_PACKAGE",
          severity: "error",
        }),
      ]),
    );
  });

  it("redacts secret-like connection values from the serialized contract", () => {
    const secretValues = {
      CAMPAIGN_OS_DATABASE_URL: "postgres://user:pass@db.internal/campaign",
      CAMPAIGN_OS_DATABASE_PASSWORD: "plain-password",
      CAMPAIGN_OS_DATABASE_TOKEN: "token-value",
      CAMPAIGN_OS_DATABASE_BEARER: "Bearer abc",
      CAMPAIGN_OS_DATABASE_PRIVATE_KEY: "private-key",
      CAMPAIGN_OS_DATABASE_SIGNED_URL: "https://signed.example/upload?sig=abc",
      CAMPAIGN_OS_DATABASE_OBJECT_KEY: "object-key",
      CAMPAIGN_OS_DATABASE_MNEMONIC: "seed phrase words",
      CAMPAIGN_OS_DATABASE_SIGNATURE: "wallet-signature",
    };
    const requestedConnectionLabel = "postgres://user:raw-secret@db.example/prod";
    const contract = createProductionDatabaseAdapterRuntimeContract({
      env: {
        ...secretValues,
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
      requestedConnectionLabel,
    });
    const serialized = JSON.stringify(contract);

    expect(contract.connectionPool).toMatchObject({
      configuredKeyCount: Object.keys(secretValues).length,
      state: "configured_redacted",
    });
    expect(contract.connectionPool.redactedFields).toEqual(
      expect.arrayContaining(Object.keys(secretValues)),
    );
    expect(serialized).toContain("CAMPAIGN_OS_DATABASE_URL");
    expect(serialized).toContain("[redacted]");
    expect(contract.packageBinding.diagnosticCodes).toContain("UNSAFE_PRODUCTION_DB_PACKAGE_BINDING_CONFIG");

    for (const secretValue of Object.values(secretValues)) {
      expect(serialized).not.toContain(secretValue);
    }

    expect(serialized).not.toContain(requestedConnectionLabel);
  });

  it("fails closed for unsupported provider and driver without leaking raw ids", () => {
    const providerId = "https://provider.example/tenant?token=secret";
    const driverId = "postgres://user:secret@db.internal/campaign";
    const contract = createProductionDatabaseAdapterRuntimeContract({
      driverId,
      env: {},
      providerId,
    });
    const serialized = JSON.stringify(contract);

    expect(contract.valid).toBe(false);
    expect(contract.status).toBe("blocked");
    expect(contract.providerId).toBe("[redacted]");
    expect(contract.driverId).toBe("[redacted]");
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DATABASE_PROVIDER_NOT_FOUND",
          severity: "error",
        }),
        expect.objectContaining({
          code: "DATABASE_DRIVER_NOT_FOUND",
          severity: "error",
        }),
      ]),
    );
    expect(serialized).not.toContain(providerId);
    expect(serialized).not.toContain(driverId);
  });

  it("represents all required v0.2 stores and deferred attach dependencies", () => {
    const contract = createProductionDatabaseAdapterRuntimeContract({ env: {} });

    expect(contract.stores.map((store) => store.id)).toEqual(productionDatabaseRequiredStoreIds);
    expect(contract.packageBinding.storeCoverage.map((store) => store.storeId)).toEqual(
      productionDatabaseRequiredStoreIds,
    );
    expect(contract.stores.every((store) => store.ownerServiceId && store.schemaVersion)).toBe(true);
    expect(contract.stores.every((store) => store.adapterStatus === "mapped")).toBe(true);
    expect(contract.deferredDependencies.map((dependency) => dependency.id)).toEqual(
      databaseAdapterDeferredDependencies.map((dependency) => dependency.id),
    );
    expect(contract.deferredDependencies.map((dependency) => dependency.id)).toEqual(
      expect.arrayContaining([
        "driver-package-selection",
        "db-deployment-env",
        "schema-migration-implementation",
        "connection-pool-implementation",
        "migration-lock",
        "backup-restore-plan",
        "secret-manager",
        "observability-exporter",
      ]),
    );
  });

  it("maps repository handoff attach points for each v0.2 service store without live access", () => {
    const contract = createProductionDatabaseAdapterRuntimeContract({ env: {} });

    expect(contract.repositoryHandoff).toMatchObject({
      id: "campaign-os-production-repository-handoff",
      liveQueriesEnabled: false,
      liveWritesEnabled: false,
      profileId: "local-review",
      status: "metadata_ready",
    });
    expect(contract.repositoryHandoff.attachPoints).toEqual([
      expect.objectContaining({
        attachPoint: "src/server/persistence.ts:createCampaignOsRepository",
        liveQueriesEnabled: false,
        liveWritesEnabled: false,
        ownerServiceId: "campaign-service",
        serviceLabel: "Campaign Service",
        storeId: "campaign-db",
      }),
      expect.objectContaining({
        ownerServiceId: "wallet-session-service",
        serviceLabel: "Wallet Session Service",
        storeId: "wallet-session-db",
      }),
      expect.objectContaining({
        ownerServiceId: "verification-service",
        serviceLabel: "Verification Service",
        storeId: "task-evidence-db",
      }),
      expect.objectContaining({
        ownerServiceId: "i18n-content-service",
        serviceLabel: "i18n Content Service",
        storeId: "i18n-content-db",
      }),
      expect.objectContaining({
        ownerServiceId: "risk-intelligence-service",
        serviceLabel: "Risk Intelligence Service",
        storeId: "risk-event-db",
      }),
      expect.objectContaining({
        ownerServiceId: "points-ranking-service",
        serviceLabel: "Points/Ranking Service",
        storeId: "points-ledger",
      }),
    ]);
    expect(contract.repositoryHandoff.attachPoints.every((point) => !point.liveQueriesEnabled)).toBe(true);
    expect(contract.repositoryHandoff.attachPoints.every((point) => !point.liveWritesEnabled)).toBe(true);
  });

  it("keeps production-required repository handoff blocked without enabling live access", () => {
    const contract = createProductionDatabaseAdapterRuntimeContract({
      env: {
        CAMPAIGN_OS_BACKEND_PROFILE: "production-required",
      },
    });

    expect(contract.repositoryHandoff).toMatchObject({
      liveQueriesEnabled: false,
      liveWritesEnabled: false,
      profileId: "production-required",
      status: "blocked",
    });
    expect(contract.repositoryHandoff.blockers).toEqual(
      expect.arrayContaining([
        "driver-package-selection",
        "connection-pool-implementation",
        "migration-lock",
        "backup-restore-plan",
        "secret-manager",
      ]),
    );
  });
});
