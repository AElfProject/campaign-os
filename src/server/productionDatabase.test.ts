import { describe, expect, it } from "vitest";
import {
  createProductionDatabaseAdapterContract,
  productionDatabaseRequiredStoreIds,
  productionDatabaseSchemaManifest,
  productionDatabaseStoreRegistry,
  validateProductionDatabaseAdapterContract,
  validateProductionDatabaseStores,
  type ProductionDatabaseStoreRegistryEntry,
} from "./productionDatabase";

describe("production database contract", () => {
  it("declares the six required Mission 169 relational stores", () => {
    expect(productionDatabaseRequiredStoreIds).toEqual([
      "campaign-db",
      "wallet-session-db",
      "task-evidence-db",
      "i18n-content-db",
      "risk-event-db",
      "points-ledger",
    ]);
    expect(productionDatabaseStoreRegistry.map((store) => store.id)).toEqual(
      productionDatabaseRequiredStoreIds,
    );
  });

  it("defines owner, entity, schema, and migration coverage for every required store", () => {
    for (const store of productionDatabaseStoreRegistry) {
      expect(store.ownerServiceId).not.toHaveLength(0);
      expect(store.label).not.toHaveLength(0);
      expect(store.entities.length).toBeGreaterThan(0);
      expect(store.operationCapability).toMatchObject({
        adHocRawSqlEnabled: false,
        migrationPlanRequired: true,
        parameterizedQueries: true,
        transactions: true,
      });
      expect(store.operationCapability?.operations).toEqual(
        expect.arrayContaining(["select", "insert", "update", "upsert", "migration_plan"]),
      );
      expect(store.productionMode).toBe("relational_database");
      expect(store.schemaVersion).toMatch(/^v\d+\.\d+\.\d+$/);
      expect(store.migrationRequired).toBe(true);
      expect(store.readiness).toBe("contract_ready");
    }
  });

  it("exposes a schema manifest for the six required relational stores", () => {
    expect(productionDatabaseSchemaManifest).toMatchObject({
      id: "campaign-os-production-db-schema-v0.2",
      schemaVersion: "v0.2.0",
      storeCount: 6,
    });
    expect(productionDatabaseSchemaManifest.requiredStoreIds).toEqual(
      productionDatabaseRequiredStoreIds,
    );
    expect(productionDatabaseSchemaManifest.stores.map((store) => store.id)).toEqual(
      productionDatabaseRequiredStoreIds,
    );
    expect(productionDatabaseSchemaManifest.migrationRequiredStoreIds).toEqual(
      productionDatabaseRequiredStoreIds,
    );
  });

  it("keeps the production database adapter contract-only in local review", () => {
    const contract = createProductionDatabaseAdapterContract({
      profileId: "local-review",
    });

    expect(contract).toMatchObject({
      id: "campaign-os-production-db-adapter",
      kind: "production_database",
      localReviewOnly: true,
      schemaManifest: {
        id: "campaign-os-production-db-schema-v0.2",
      },
      requiresConnectionString: true,
      requiresMigrationRunner: true,
      status: "contract_ready",
    });
    expect(contract.ownerStores).toEqual(productionDatabaseRequiredStoreIds);
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_DATABASE_CONTRACT_ONLY",
          severity: "info",
        }),
      ]),
    );
  });

  it("blocks production-required readiness without a configured database boundary", () => {
    const contract = createProductionDatabaseAdapterContract({
      profileId: "production-required",
    });

    expect(contract.status).toBe("blocked");
    expect(contract.localReviewOnly).toBe(false);
    expect(contract.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_DATABASE_CONFIG_REQUIRED",
          severity: "error",
        }),
      ]),
    );
    expect(validateProductionDatabaseAdapterContract(contract)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_DATABASE_CONFIG_REQUIRED",
          field: "connection",
          severity: "error",
        }),
      ]),
    );
  });

  it("does not expose secret-like values in diagnostics", () => {
    const contract = createProductionDatabaseAdapterContract({
      profileId: "production-required",
      requestedConnectionLabel: "postgres://user:password@db.example/prod",
    });
    const serialized = JSON.stringify(contract);

    expect(serialized).not.toContain("postgres://user:password@db.example/prod");
    expect(serialized).toContain("[redacted]");
  });

  it("validates missing required stores, duplicate stores, and incomplete schema metadata", () => {
    const duplicateStore = {
      ...productionDatabaseStoreRegistry[0],
    } satisfies ProductionDatabaseStoreRegistryEntry;
    const invalidStore = {
      ...productionDatabaseStoreRegistry[1],
      entities: [],
      operationCapability: undefined,
      ownerServiceId: "",
      productionMode: "object_storage",
      schemaVersion: "",
    } satisfies ProductionDatabaseStoreRegistryEntry;
    const stores = [
      productionDatabaseStoreRegistry[0],
      duplicateStore,
      invalidStore,
      ...productionDatabaseStoreRegistry.slice(2, -1),
    ];

    expect(validateProductionDatabaseStores(stores)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PRODUCTION_DATABASE_STORE_DUPLICATE_ID",
          field: "campaign-db",
        }),
        expect.objectContaining({
          code: "PRODUCTION_DATABASE_STORE_REQUIRED_MISSING",
          field: "points-ledger",
        }),
        expect.objectContaining({
          code: "PRODUCTION_DATABASE_STORE_MISSING_OWNER",
          field: "wallet-session-db",
        }),
        expect.objectContaining({
          code: "PRODUCTION_DATABASE_STORE_MISSING_ENTITIES",
          field: "wallet-session-db",
        }),
        expect.objectContaining({
          code: "PRODUCTION_DATABASE_STORE_MISSING_SCHEMA",
          field: "wallet-session-db",
        }),
        expect.objectContaining({
          code: "PRODUCTION_DATABASE_STORE_UNSUPPORTED_MODE",
          field: "wallet-session-db",
        }),
        expect.objectContaining({
          code: "PRODUCTION_DATABASE_STORE_MISSING_OPERATION_CAPABILITY",
          field: "wallet-session-db",
        }),
      ]),
    );
  });
});
