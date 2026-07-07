import { describe, expect, it } from "vitest";
import {
  backendStorePorts,
  createPersistenceAdapterPortReport,
  validatePersistenceAdapterPorts,
  type PersistenceAdapterPort,
} from "./persistenceAdapterPort";
import { productionDatabaseRequiredStoreIds } from "./productionDatabase";

describe("persistence adapter port", () => {
  it("reports memory as the default active local adapter", () => {
    const report = createPersistenceAdapterPortReport();

    expect(report.activeAdapter).toMatchObject({
      durable: false,
      id: "campaign-os-memory-adapter",
      kind: "memory",
      localOnly: true,
      requiresConnectionString: false,
      requiresMigrationRunner: false,
      status: "active",
    });
    expect(report.validation.valid).toBe(true);
    expect(report.adapters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          queryCapability: {
            adHocRawSqlEnabled: false,
            liveQueryExecutionEnabled: false,
            parameterizedQueries: true,
            transactionMode: "deterministic_test",
          },
          id: "campaign-os-production-db-adapter",
          kind: "production_deferred",
          ownerStores: productionDatabaseRequiredStoreIds,
          repositoryContractCount: expect.any(Number),
          requiresConnectionString: true,
          requiresMigrationRunner: true,
          schemaVersion: "v0.2.0",
          status: "deferred",
        }),
      ]),
    );
  });

  it("reports the deterministic test adapter as available for repository contract tests", () => {
    const report = createPersistenceAdapterPortReport({
      activeDriverId: "campaign-os-deterministic-test-adapter",
    });

    expect(report.activeAdapter).toMatchObject({
      id: "campaign-os-deterministic-test-adapter",
      kind: "deterministic_test",
      localOnly: true,
      queryCapability: {
        adHocRawSqlEnabled: false,
        liveQueryExecutionEnabled: false,
        parameterizedQueries: true,
        transactionMode: "deterministic_test",
      },
      status: "active",
    });
    expect(report.validation.valid).toBe(true);
  });

  it("reports local JSON as active and durable when selected", () => {
    const report = createPersistenceAdapterPortReport({
      persistenceMode: "local_json",
    });

    expect(report.activeAdapter).toMatchObject({
      durable: true,
      id: "campaign-os-local-json-adapter",
      kind: "local_json",
      localOnly: true,
      status: "active",
    });
  });

  it("maps every future backend store to an adapter owner and attach point", () => {
    expect(backendStorePorts.map((store) => store.id)).toEqual([
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

    for (const store of backendStorePorts) {
      expect(store.adapterOwnerId).not.toHaveLength(0);
      expect(store.attachPoint).toContain("src/server/persistence.ts");
      expect(store.ownerServiceId).not.toHaveLength(0);
      expect(store.futureProductionMode).toMatch(
        /relational_database|object_storage|analytics_warehouse|contract_index/,
      );
    }

    const relationalStores = backendStorePorts.filter(
      (store) => store.adapterOwnerId === "campaign-os-production-db-adapter",
    );

    expect(relationalStores.map((store) => store.id)).toEqual(
      productionDatabaseRequiredStoreIds,
    );

    for (const store of relationalStores) {
      expect(store.entities?.length).toBeGreaterThan(0);
      expect(store.schemaVersion).toBe("v0.2.0");
      expect(store.blockedBy).toEqual(
        expect.arrayContaining([
          "live production database provider selection mission",
          "protected live migration execution mission",
          "connection secret boundary",
        ]),
      );
    }
  });

  it("keeps production adapter metadata aligned with registry decisions", () => {
    const report = createPersistenceAdapterPortReport({
      activeDriverId: "campaign-os-production-db-adapter",
      profileId: "production-required",
    });
    const productionAdapter = report.adapters.find(
      (adapter) => adapter.id === "campaign-os-production-db-adapter",
    );

    expect(productionAdapter).toMatchObject({
      durable: true,
      kind: "production_deferred",
      ownerStores: productionDatabaseRequiredStoreIds,
      queryCapability: {
        adHocRawSqlEnabled: false,
        liveQueryExecutionEnabled: false,
        parameterizedQueries: true,
      },
      repositoryContractCount: expect.any(Number),
      requiresConnectionString: true,
      requiresMigrationGate: true,
      requiresMigrationRunner: true,
      sideEffectPolicy: "live_external_deferred",
      status: "blocked",
      supportsReset: false,
      supportsTransactions: true,
    });
    expect(report.validation.valid).toBe(false);
  });

  it("rejects production adapter activation in local review", () => {
    const productionAdapter: PersistenceAdapterPort = {
      attachPoints: ["src/server/persistence.ts"],
      diagnostics: [],
      durable: true,
      id: "campaign-os-production-db-adapter",
      kind: "production_deferred",
      label: "Future production DB",
      localOnly: false,
      ownerStores: ["campaign-db"],
      requiresConnectionString: true,
      requiresMigrationRunner: true,
      status: "active",
    };

    expect(
      validatePersistenceAdapterPorts({
        adapters: [productionAdapter],
        profileId: "local-review",
        stores: [
          {
            adapterOwnerId: "campaign-os-production-db-adapter",
            attachPoint: "src/server/persistence.ts",
            blockedBy: [],
            currentMode: "deferred",
            futureProductionMode: "relational_database",
            id: "campaign-db",
            label: "Campaign DB",
            ownerServiceId: "campaign-service",
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        code: "PRODUCTION_ADAPTER_DEFERRED",
        field: "campaign-os-production-db-adapter",
        severity: "error",
      }),
    ]);
  });

  it("reports unknown adapter ownership as an unsupported persistence adapter", () => {
    const issues = validatePersistenceAdapterPorts({
      adapters: [],
      stores: [
        {
          adapterOwnerId: "missing-adapter",
          attachPoint: "src/server/persistence.ts",
          blockedBy: [],
          currentMode: "deferred",
          futureProductionMode: "relational_database",
          id: "campaign-db",
          label: "Campaign DB",
          ownerServiceId: "campaign-service",
        },
      ],
    });

    expect(issues).toEqual([
      expect.objectContaining({
        code: "UNSUPPORTED_PERSISTENCE_ADAPTER",
        field: "campaign-db",
        severity: "error",
      }),
    ]);
  });
});
