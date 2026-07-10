import { describe, expect, it } from "vitest";
import {
  createDatabaseProviderRegistryReport,
  databaseDriverDescriptors,
  databaseProviderDescriptors,
} from "./databaseProviderRegistry";
import { productionDatabaseRequiredStoreIds } from "./productionDatabase";

describe("database provider registry", () => {
  it("declares deterministic and deferred production provider descriptors", () => {
    expect(databaseProviderDescriptors.map((provider) => provider.id)).toEqual([
      "campaign-os-deterministic-test-db",
      "campaign-os-provider-deferred",
      "campaign-os-managed-postgres-deferred",
      "campaign-os-self-hosted-relational-deferred",
    ]);
    expect(databaseDriverDescriptors.map((driver) => driver.id)).toEqual([
      "campaign-os-deterministic-test-driver",
      "campaign-os-production-driver-deferred",
      "campaign-os-managed-postgres-driver-deferred",
      "campaign-os-self-hosted-relational-driver-deferred",
    ]);
  });

  it("selects the deterministic test driver for local review without live side effects", () => {
    const report = createDatabaseProviderRegistryReport({
      profileId: "local-review",
    });

    expect(report.validation.valid).toBe(true);
    expect(report.selectedProviderId).toBe("campaign-os-deterministic-test-db");
    expect(report.selectedDriverId).toBe("campaign-os-deterministic-test-driver");
    expect(report.activeProvider).toMatchObject({
      requiresNetwork: false,
      requiresSecretManager: false,
      sideEffectPolicy: "none",
      status: "available",
    });
    expect(report.activeDriver).toMatchObject({
      packageBinding: expect.objectContaining({
        bindingId: "campaign-os-postgresql-package-binding-local",
        packageName: "pg",
        packageRef: "npm:pg",
        productionReady: false,
        status: "local_ready",
        valid: true,
      }),
      status: "available",
      supportedStoreIds: productionDatabaseRequiredStoreIds,
      supportsTransactions: true,
    });
    expect(report.activeDriver?.capability).toEqual({
      adHocRawSql: false,
      parameterizedQueries: true,
      pooling: false,
      requiresNetwork: false,
      requiresSecretManager: false,
      transactions: true,
    });
  });

  it("blocks the default production driver in production-required profile", () => {
    const report = createDatabaseProviderRegistryReport({
      profileId: "production-required",
    });

    expect(report.selectedProviderId).toBe("campaign-os-provider-deferred");
    expect(report.selectedDriverId).toBe("campaign-os-production-driver-deferred");
    expect(report.validation.valid).toBe(false);
    expect(report.activeProvider).toMatchObject({
      status: "blocked",
    });
    expect(report.activeDriver).toMatchObject({
      packageBinding: expect.objectContaining({
        bindingId: "campaign-os-postgresql-package-binding-production",
        blockerCount: 11,
        diagnosticCodes: expect.arrayContaining([
          "PRODUCTION_DB_PACKAGE_REFERENCE_MISSING",
          "PRODUCTION_DB_PROVIDER_SELECTION_MISSING",
          "PRODUCTION_DB_CONNECTION_REFERENCE_MISSING",
          "PRODUCTION_DB_LIVE_ENABLEMENT_MISSING",
        ]),
        packageName: "pg",
        packageRef: "npm:pg",
        productionReady: false,
        status: "blocked",
        valid: false,
      }),
      status: "blocked",
    });
    expect(report.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DATABASE_DRIVER_PRODUCTION_DEFERRED",
          severity: "error",
        }),
      ]),
    );
    expect(report.activeDriver?.capability).toEqual({
      adHocRawSql: false,
      parameterizedQueries: true,
      pooling: true,
      requiresNetwork: true,
      requiresSecretManager: true,
      transactions: true,
    });
  });

  it("fails closed for unknown provider and driver ids without leaking raw secret-like values", () => {
    const report = createDatabaseProviderRegistryReport({
      driverId: "postgres://user:secret@db.internal/campaign",
      profileId: "production-required",
      providerId: "https://provider.example/tenant?token=secret",
    });
    const serialized = JSON.stringify(report);

    expect(report.validation.valid).toBe(false);
    expect(report.selectedProviderId).toBe("[redacted]");
    expect(report.selectedDriverId).toBe("[redacted]");
    expect(report.validation.issues).toEqual(
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
    expect(serialized).not.toContain("postgres://user:secret@db.internal/campaign");
    expect(serialized).not.toContain("https://provider.example/tenant?token=secret");
  });

  it("rejects provider and driver mismatches", () => {
    const report = createDatabaseProviderRegistryReport({
      driverId: "campaign-os-production-driver-deferred",
      providerId: "campaign-os-deterministic-test-db",
    });

    expect(report.validation.valid).toBe(false);
    expect(report.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DATABASE_PROVIDER_DRIVER_MISMATCH",
          severity: "error",
        }),
      ]),
    );
  });

  it("keeps every registered driver scoped to v0.2 production database stores", () => {
    for (const driver of databaseDriverDescriptors) {
      expect(driver.supportedStoreIds).toEqual(productionDatabaseRequiredStoreIds);
      expect(driver.packageBinding.requiredStoreIds).toEqual(productionDatabaseRequiredStoreIds);
      expect(driver.packageBinding.noLiveFlags).toMatchObject({
        dbClientConstructed: false,
        liveConnectionAttempted: false,
        liveMigrationExecutionEnabled: false,
        liveQueryExecutionEnabled: false,
        liveTransactionExecutionEnabled: false,
        secretValueExposed: false,
      });
      expect(driver.supportedStoreIds).not.toContain("export-store");
      expect(driver.supportedStoreIds).not.toContain("analytics-warehouse");
      expect(driver.supportedStoreIds).not.toContain("contract-index");
    }
  });
});
