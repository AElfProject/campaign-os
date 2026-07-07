import { describe, expect, it } from "vitest";
import {
  createPersistenceDriverRegistryReport,
  persistenceDriverDescriptors,
} from "./persistenceDriverRegistry";
import { productionDatabaseRequiredStoreIds } from "./productionDatabase";

describe("persistence driver registry", () => {
  it("declares memory, local JSON, deterministic test, and production-deferred drivers", () => {
    expect(persistenceDriverDescriptors.map((driver) => driver.id)).toEqual([
      "campaign-os-memory-adapter",
      "campaign-os-local-json-adapter",
      "campaign-os-deterministic-test-adapter",
      "campaign-os-production-db-adapter",
    ]);
    expect(persistenceDriverDescriptors.map((driver) => driver.kind)).toEqual([
      "memory",
      "local_json",
      "deterministic_test",
      "production_deferred",
    ]);
    for (const driver of persistenceDriverDescriptors) {
      expect(driver.label).not.toHaveLength(0);
      expect(driver.ownerStores.length).toBeGreaterThan(0);
      expect(driver).toMatchObject({
        requiresConnectionString: expect.any(Boolean),
        requiresMigrationGate: expect.any(Boolean),
        supportsReset: expect.any(Boolean),
        supportsTransactions: expect.any(Boolean),
      });
    }
  });

  it("marks local drivers as local-only and production driver as gate-required", () => {
    const report = createPersistenceDriverRegistryReport({
      activeDriverId: "campaign-os-memory-adapter",
      profileId: "local-review",
    });
    const productionDriver = report.drivers.find(
      (driver) => driver.id === "campaign-os-production-db-adapter",
    );

    expect(report.activeDriverId).toBe("campaign-os-memory-adapter");
    expect(report.drivers.filter((driver) => driver.localOnly).map((driver) => driver.kind)).toEqual([
      "memory",
      "local_json",
      "deterministic_test",
    ]);
    expect(productionDriver).toMatchObject({
      kind: "production_deferred",
      requiresConnectionString: true,
      requiresMigrationGate: true,
      sideEffectPolicy: "live_external_deferred",
      status: "deferred",
    });
  });

  it("blocks production driver in production-required profile until runtime preconditions exist", () => {
    const report = createPersistenceDriverRegistryReport({
      activeDriverId: "campaign-os-production-db-adapter",
      profileId: "production-required",
    });

    expect(report.activeDriverId).toBe("campaign-os-production-db-adapter");
    expect(report.validation.valid).toBe(false);
    expect(report.drivers.find((driver) => driver.id === report.activeDriverId)).toMatchObject({
      status: "blocked",
    });
    expect(report.validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PERSISTENCE_DRIVER_PRODUCTION_DEFERRED",
          severity: "error",
        }),
      ]),
    );
  });

  it("keeps required production store ownership aligned to v0.2 coverage", () => {
    const productionDriver = persistenceDriverDescriptors.find(
      (driver) => driver.id === "campaign-os-production-db-adapter",
    );

    expect(productionDriver?.ownerStores).toEqual(productionDatabaseRequiredStoreIds);
  });

  it("serializes provider decision metadata without config values", () => {
    const report = createPersistenceDriverRegistryReport({
      activeDriverId: "campaign-os-production-db-adapter",
      profileId: "production-required",
    });

    expect(report.drivers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "campaign-os-production-db-adapter",
          kind: "production_deferred",
          label: "Campaign OS production database adapter",
          ownerStores: productionDatabaseRequiredStoreIds,
          requiresConnectionString: true,
          requiresMigrationGate: true,
          sideEffectPolicy: "live_external_deferred",
          status: "blocked",
          supportsTransactions: true,
        }),
      ]),
    );
    expect(JSON.stringify(report)).not.toContain("postgres://");
    expect(JSON.stringify(report)).not.toContain("plain-password");
  });
});
