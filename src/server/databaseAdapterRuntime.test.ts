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
});
